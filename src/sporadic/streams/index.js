/* eslint-env node, es6 */

// @ts-check

'use strict'

const tasks = require('../tasks')
const channels = require('../channels')

const error = () => Error('Stream is closed!')

/**
 * @template T
 * @typedef {object} SporadicStream<T>
 * @property {Promise<T>} current
 * @property {Promise<SporadicStream<T>>} next
 * @property {(value: T) => void} resolve
 * @property {(reason: any) => void} reject
 * @property {boolean} produced
 * @property {boolean} broken
 * @property {((value: T) => T) | null} stepper
 * @property {T | null} pastValue
 * @property {(() => void) | null} finalizer
 *  property {undefined | null | Promise<SporadicStream<T>>} next
 *  property {undefined | null | SporadicStream<T>} nextPoint
 *  property {undefined | null | ((value: SporadicStream<T>) => void)} resolveNext
 *  property {undefined | null | ((reason: any) => void)} rejectNext
 */

// needed to perform asynchronous recursion, see function below

/*
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @returns
 */
/*
const ensureNext = stream => {
  if (!stream.nextPoint) {
    stream.nextPoint = createStream(stream.finalizer, stream.stepper, stream.pastValue, false)
    // stream.resolveNext(stream.nextPoint)
  }

  return stream.nextPoint
}
*/

/**
 * @function
 * @template T
 * @param {null | (() => void)} finalizer
 * @param {null | ((value: T) => T)} stepper
 * @param {null | T} pastValue
 * @param {boolean} isFirstNode
 * @returns {SporadicStream<T>}
 */
function createStream (finalizer = null, stepper = null, pastValue = null, isFirstNode = false) {
  const { promise, resolve, reject } = tasks.defer()
  // stepper = stepper || (value => value)

  const broken = false
  const produced = false
  const next = promise.then(pastValue => createStream(finalizer, stepper, pastValue, false))
  // const nextDeferred = tasks.defer()

  /** @type {SporadicStream<T>} */
  const stream = {
    current: promise,
    next,
    // next: nextDeferred.promise,
    // nextPoint: null,
    // resolveNext: null,
    // rejectNext: null,
    // resolveNext: nextDeferred.resolve,
    // rejectNext: nextDeferred.reject,
    resolve,
    reject,
    produced,
    broken,
    stepper,
    pastValue,
    finalizer
  }

  if (pastValue !== null && pastValue !== undefined && isFirstNode) {
    stream.resolve(pastValue)
    stream.produced = true
    // ensureNext(stream)
  }

  return stream
}

/**
 * @function
 * @template T
 * @returns {Promise<SporadicStream<T>>}
 */
const open = () => Promise.resolve(createStream())

/**
 * @function
 * @template T
 * @param {T} initial
 * @param {(value: T) => T} folding
 * @returns {Promise<SporadicStream<T>>}
 * @description Creates an ondemand stream that computes values based on initial value and folding callback
 * @summary Creates an ondemand stream that computes values based on initial value and folding callback
 */
const reducer = async (initial, folding) => {
  return createStream(null, folding, initial, true)
}

/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @returns {Promise<{ current: T, next: SporadicStream<T> }>}
 */
const pull = async stream => {
  if (stream.stepper && !stream.produced && !stream.broken && stream.pastValue !== null && stream.pastValue !== undefined) {
    try {
      const stepperWrapper = async () =>
        stream.stepper && stream.pastValue !== null && stream.pastValue !== undefined ? stream.stepper(stream.pastValue) : null
      const stepResult = await stepperWrapper()
      // if (stepResult) {
      if (stepResult !== null && stepResult !== undefined) {
        // stream.pastValue = stepResult
        stream.resolve(stepResult)
        stream.produced = true
        // ensureNext(stream)
        stream.stepper = null
        stream.pastValue = null
      }
    } catch (reason) {
      // NOTE: shallow/ignore error/reason
      // stream.current.catch(() => { })
      // stream.next.catch(() => { })
      stream.reject(reason)
      // stream.rejectNext(reason)
      stream.broken = true
      stream.stepper = null
      stream.pastValue = null
    }
  }
  const current = await stream.current
  const next = await stream.next
  // const next = stream.nextPoint || ensureNext(stream)

  return {
    current,
    next
  }
}

/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @returns {Promise<{ point: SporadicStream<T> }>}
 */
const available = async stream => {
  let point = stream

  while (point.produced && !point.broken) {
    point = await point.next
  }

  return { point }
}

/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @param {T} value
 * @returns {Promise<SporadicStream<T>>}
 */
const push = async (stream, value) => {
  const { point } = await available(stream)

  // point.pastValue = value
  point.resolve(value)
  point.produced = true

  const result = await point.next // creates a new stream point/node

  return result
  // return ensureNext(point)
}

/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @returns {Promise<never>}
 * @description Operation to close a given stream, it never returns and always fails with error
 * @summary Operation to close a given stream, it never returns and always fails with error
 */
const close = async stream => {
  const { point } = await available(stream)

  if (point.broken) {
    await point.next // always fails
  } else {
    // const reason = error()
    // NOTE: shallow/ignore error/reason
    // point.current.catch(() => { })
    // point.next.catch(() => { })
    point.reject(error())
    // point.rejectNext(reason)
    point.produced = true
    point.broken = true
    point.stepper = null

    try {
      if (point.finalizer) {
        point.finalizer()
      }
    } catch (reason) {
      // shallow/ignore error/reason
    }

    await point.next // breaks as well
  }

  throw new Error('NEVER REACHED CASE CAUSE PROMISES ABOVE WOULD BREAK')
}

/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @returns
 */
const protectedClose = (stream) =>
  close(stream).catch(() => {
    // shallow/ignore error/reason
  })

/**
 * @function
 * @param {number} interval The interval in milliseconds
 * @returns {Promise<SporadicStream<boolean>>}
 * @description Fires a stream ticking every given milliseconds (interval), publishing just a true value
 * @summary Fires a stream ticking every given milliseconds (interval), publishing just a true value
 */
const every = (interval) => {
  let finalizer = () => { }
  const stream = createStream(() => finalizer())
  let currentStream = stream

  const intervalId = setInterval(() => {
    // if (!currentStream.produced && !currentStream.broken) {
      tasks.ignore(
        push(currentStream, true).then(nextStream => {
          currentStream = nextStream
        }) // .catch() here is never reached :)
      )
      // currentStream.pastValue = true
      // currentStream.resolve(true)
      // currentStream.produced = true
      // currentStream = ensureNext(currentStream)
    // }
  }, interval)

  finalizer = () => {
    clearInterval(intervalId)
  }

  return Promise.resolve(stream)
}

// stream * closure -> boolean promise
/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream The source stream to react upon
 * @param {(value: T) => void} procedure A callback to react on stream values
 * @returns {Promise<boolean>} The promise resolved as true if the source stream is closed
 * @summary Reacts to every value published to stream, resolving a boolean promise whenever the source stream is closed
 * @description Reacts to every value published to stream, resolving a boolean promise whenever the source stream is closed
 */
const react = async (stream, procedure) => {
  const deferred = tasks.defer()
  let currentStream = stream

  try {
    while (true) {
      const result = await pull(currentStream)
      currentStream = result.next

      try {
        // forces promise resolution if procedure is async
        const procedureWrapper = async () => procedure(result.current)
        await procedureWrapper()
        // NOTE: a simple yield/suspend codepoint below
        // await Promise.resolve()
      } catch (reason) {
        deferred.reject(reason)
        throw reason // next catch won't resolve deferred, resolve is ignored
      }
    }
  } catch (reason) {
    deferred.resolve(true)
  }

  const isClosed = await deferred.promise
  return isClosed
}

// stream * closure -> stream promise
/**
 * @function
 * @template T
 * @param {SporadicStream<T>} stream
 * @param {(value: T) => boolean} predicate
 * @returns {Promise<SporadicStream<T>>}
 */
const filter = async (stream, predicate) => {
  const filtered = createStream()
  let newStream = filtered // alias to allow garbage collection here

  react(stream, value => {
    // the call predicate(value) may fail
    try {
      if (predicate(value)) {
        push(newStream, value).then(nextStream => {
          newStream = nextStream
        }).catch(reason => {
          protectedClose(newStream)
        })
      }
    } catch (reason) {
      protectedClose(newStream)
    }
  }).then(() => {
    protectedClose(newStream)
  }) // .catch() is never reached here :p

  return filtered // we still return the original / first stream point
}

/**
 * @function
 * @template T
 * @template U
 * @param {SporadicStream<T>} stream
 * @param {(value: T) => U} closure
 * @returns {Promise<SporadicStream<U>>}
 */
const map = async (stream, closure) => {
  const transformed = createStream()
  let newStream = transformed // alias to allow garbage collection here

  react(stream, value => {
    try {
      push(newStream, closure(value)).then(nextStream => {
        newStream = nextStream
      }).catch(reason => {
        protectedClose(newStream)
      })
    } catch (reason) {
      protectedClose(newStream)
    }
  }).then(() => {
    protectedClose(newStream) // closes result stream if origin is closed too
  }) // .catch() here is never reached :)

  return transformed // we still return the original / first stream point
}

/**
 * @function
 * @template T
 * @param {SporadicStream<T>} leftStream
 * @param {SporadicStream<T>} rightStream
 * @returns {Promise<SporadicStream<T[]>>}
 */
const paired = async (leftStream, rightStream) => {
  const outputStream = await open()
  let pairedStream = outputStream
  let leftStreamPoint = leftStream
  let rightStreamPoint = rightStream

  let bufferLeftChannel = await channels.open()
  let bufferRightChannel = await channels.open()

  react(leftStreamPoint, async leftStreamSignal => {
    await channels.send(bufferLeftChannel, leftStreamSignal)
  })
  react(rightStreamPoint, async rightStreamSignal => {
    await channels.send(bufferRightChannel, rightStreamSignal)
  })
  tasks.spawn(async () => {
    try {
      while (true) {
        const [ leftValue, rightValue ] = await Promise.all([
          channels.receive(bufferLeftChannel),
          channels.receive(bufferRightChannel)
        ])
        // if (leftValue === null || leftValue === undefined) return;
        // if (rightValue === null || rightValue === undefined) return;
        pairedStream = await push(pairedStream, [ leftValue, rightValue ])
      }
    }
    catch (reason) {
      // NOTE: we close intermediary channel layers and the final paired stream
      await channels.close(bufferLeftChannel)
      await channels.close(bufferRightChannel)
      await protectedClose(pairedStream)
    }
  })
  return outputStream

  // NOTE: this implementation, instead of reacting only over one point,
  // synchronizes both stream points, making it far less bug prone due reordering
  // tasks.ignore(tasks.spawn(async () => {
  //  try {
  //    while (true) {
        /*
        const rightStreamNode = await pull(rightStreamPoint)
        rightStreamPoint = rightStreamNode.next
        pairedStream = await push(pairedStream, [ leftValue, rightStreamNode.current ])
        */
        // NOTE: synchronizes on both stream points with signals ready
  //      const [ leftNode, rightNode ] = await Promise.all([
  //        pull(leftStreamPoint),
  //        pull(rightStreamPoint)
  //      ])
        // NOTE: reassigns the stream points for the next iteration
  //      leftStreamPoint = leftNode.next
  //      rightStreamPoint = rightNode.next
  //      pairedStream = await push(pairedStream, [ leftNode.current, rightNode.current ])
        // NOTE: a simple yield/suspend codepoint below
  //      await Promise.resolve()
  //    }
  //  } catch (reason) {
      /*
      await Promise.all([
        protectedClose(leftStreamPoint),
        protectedClose(pairedStream)
      ])
      */
      // NOTE: only breaks the pair and not both input streams,
      // if ever any of such input streams break, so stuff is isolated
  //    await protectedClose(pairedStream)
  //  }
  // }))
  /*
  react(rightStreamPoint, async () => { })
    .catch(function () { })
    .then(() => protectedClose(pairedStream))
  */
  // return outputStream
}

/**
 * @function
 * @template T
 * @template U
 * @param {SporadicStream<T>} leftStream
 * @param {SporadicStream<U>} rightStream
 * @returns {Promise<SporadicStream<T | U>>}
 */
const merge = async (leftStream, rightStream) => {
  const mergedStream = await open()
  let stepStream = mergedStream

  /**
   * @function
   * @param {T | U} signal
   */
  const redirect = async signal => {
    stepStream = await push(stepStream, signal)
  }

  const closedLeft = react(leftStream, redirect)
  const closedRight = react(rightStream, redirect)

  Promise.all([ closedLeft, closedRight ])
    .then(() => {
      return (protectedClose(stepStream))
    })

  return mergedStream
}

module.exports.open = open
module.exports.push = push
module.exports.pull = pull
module.exports.close = close
module.exports.react = react
module.exports.filter = filter
module.exports.map = map
module.exports.every = every
module.exports.merge = merge
module.exports.paired = paired
module.exports.reducer = reducer
module.exports.protectedClose = protectedClose
