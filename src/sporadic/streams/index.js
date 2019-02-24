/* eslint-env node, es6 */

'use strict'

const utils = require('../utils')

const error = () => Error('Stream is closed!')

// needed to perform asynchronous recursion, see function below
let create = null

create = (finalizer) => {
  const { promise, resolve, reject } = utils.defer()

  const broken = false
  const produced = false
  const next = promise.then(() => create(finalizer))

  const stream = {
    current: promise,
    next,
    resolve,
    reject,
    produced,
    broken,
    finalizer
  }

  return stream
}

// unit -> stream promise
const open = (finalizer) => utils.resolved(create(finalizer))

// stream -> (value * stream) promise
// may throws reason
const pull = async stream => {
  const current = await stream.current
  const next = await stream.next

  return {
    current,
    next
  }
}

const available = async stream => {
  let point = stream

  while (point.produced && !point.broken) {
    point = await point.next
  }

  return { point }
}

// stream * value -> stream promise
const push = async (stream, value) => {
  const { point } = await available(stream)

  point.resolve(value)
  point.produced = true

  const result = await point.next // creates a new stream point/node

  return result
}

// stream * reason -> void promise
// never returns, throws reason
const close = async stream => {
  const { point } = await available(stream)

  if (point.broken) {
    await point.next // always fails
  } else {
    point.reject(error())
    point.produced = true
    point.broken = true

    try {
      if (point.finalizer) {
        point.finalizer()
      }
    } catch (reason) {
      // shallow/ignore error/reason
    }

    await point.next // breaks as well
  }
}

const protectedClose = (stream) =>
  close(stream).catch(() => {
    // shallow/ignore error/reason
  })

const every = (interval) => {
  let finalizer = null
  const stream = create(() => finalizer())
  let currentStream = stream

  const intervalId = setInterval(() => {
    push(currentStream, true).then(nextStream => {
      currentStream = nextStream
    }) // .catch() here is never reached :)
  }, interval)

  finalizer = () => {
    clearInterval(intervalId)
  }

  return utils.resolved(stream)
}

// stream * closure -> boolean promise
const react = async (stream, procedure) => {
  const deferred = utils.defer()
  let currentStream = stream

  try {
    while (true) {
      const result = await pull(currentStream)
      currentStream = result.next

      try {
        procedure(result.current)
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
const filter = async (stream, predicate) => {
  const filtered = create()
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

// stream * closure -> stream promise
const map = async (stream, closure) => {
  const transformed = create()
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

module.exports.open = open
module.exports.push = push
module.exports.pull = pull
module.exports.close = close
module.exports.react = react
module.exports.filter = filter
module.exports.map = map
module.exports.every = every
