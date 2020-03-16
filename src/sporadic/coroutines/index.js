/* eslint-env node, es6 */

'use strict'

const utils = require('../utils')
const channels = require('../channels')
const streams = require('../streams')

const State = {
  CREATED: 1,
  RUNNING: 2,
  SUSPENDED: 3,
  DEAD: 4
}

const PrintState = [
  '<undefined>',
  'CREATED',
  'RUNNING',
  'SUSPENDED',
  'DEAD'
]

const StreamsMode = {
  PERSIST: 1,
  COLLECT: 2,
  DISABLE: 3
}

const dispose = async coroutine => {
  coroutine.computation = true

  await utils.ignorePromise(channels.close(coroutine.supply))
  await utils.ignorePromise(channels.close(coroutine.demand))

  if (coroutine.options.streamsMode !== StreamsMode.DISABLE) {
    await utils.ignorePromise(streams.close(coroutine.demands))
    await utils.ignorePromise(streams.close(coroutine.supplies))
  }

  return true
}

const validateOptions = options => {
  if (
    !options ||
    (options.streamsMode !== 'DISABLE' &&
    options.streamsMode !== 'COLLECT' &&
    options.streamsMode !== 'PERSIST' &&
    options.streamsMode !== undefined &&
    options.streamsMode !== null)
  ) {
    throw Error(`Invalid coroutine configuration options.streamsMode: ${options.streamsMode}`)
  }
}

const validate = coroutine => {
  const withoutStreams =
    coroutine.options &&
    coroutine.options.streamsMode === StreamsMode.DISABLE &&
    !coroutine.supplies &&
    !coroutine.demands
  const configuredWithStreams =
    coroutine.options &&
    (coroutine.options.streamsMode === StreamsMode.PERSIST ||
    coroutine.options.streamsMode === StreamsMode.COLLECT)
  const withStreams =
    configuredWithStreams &&
    coroutine.supplies &&
    coroutine.demands
  const validStreams = withoutStreams || withStreams

  if (
    !coroutine || !coroutine.status || !coroutine.computation ||
    !coroutine.supply || !coroutine.options || !coroutine.demand ||
    !validStreams || !coroutine.result ||
    !(coroutine.result.promise instanceof Promise)
  ) {
    throw Error('Expected a valid coroutine!')
  }
}

let create = null
let suspend = null
let resume = null
let status = null
let demands = null
let supplies = null
let complete = null

create = async (computation, nullableOptions) => {
  const coroutine = {}

  const options = nullableOptions || {}
  validateOptions(options)

  options.streamsMode = options.streamsMode || 'PERSIST'
  options.streamsMode = StreamsMode[options.streamsMode]

  if (options.streamsMode !== StreamsMode.DISABLE) {
    coroutine.supplies = await streams.open()
    coroutine.demands = await streams.open()
  }

  coroutine.options = options
  coroutine.supply = await channels.open()
  coroutine.demand = await channels.open()
  coroutine.computation = computation
  coroutine.status = State.CREATED
  coroutine.result = utils.defer()

  const self = {
    suspend: (value) => suspend(coroutine, value),
    status: () => status(coroutine),
    supplies: () => supplies(coroutine),
    demands: () => demands(coroutine)
  }

  coroutine.computation = computation.bind(self)

  return coroutine
}

resume = async (coroutine, value) => {
  validate(coroutine)

  if (coroutine.status === State.RUNNING) {
    throw Error('Coroutine is already running!')
  } else if (coroutine.status === State.DEAD) {
    throw Error('Coroutine is dead!')
  }

  if (coroutine.options.streamsMode !== StreamsMode.DISABLE) {
    const nextStream = await streams.push(coroutine.demands, value)

    if (coroutine.options.streamsMode === StreamsMode.COLLECT) {
      coroutine.demands = nextStream
    }
  }

  if (coroutine.status === State.CREATED) {
    coroutine.status = State.RUNNING
    coroutine.computation(value).then(async result => {
      if (coroutine.options.streamsMode !== StreamsMode.DISABLE) {
        const nextStream = await streams.push(coroutine.supplies, result)

        if (coroutine.options.streamsMode === StreamsMode.COLLECT) {
          coroutine.supplies = nextStream
        }
      }

      channels.send(coroutine.supply, {
        value: result,
        type: 'return'
      })
      coroutine.result.resolve(result)
    }).catch(reason => {
      channels.send(coroutine.supply, {
        value: reason,
        type: 'error'
      })
      coroutine.result.reject(reason)
    })
  } else {
    coroutine.status = State.RUNNING
    channels.send(coroutine.demand, value)
  }

  const output = await channels.receive(coroutine.supply)

  if (output.type === 'error') {
    coroutine.status = State.DEAD
    dispose(coroutine)

    throw output.value
  }

  if (output.type === 'return') {
    coroutine.status = State.DEAD
    dispose(coroutine)
  }

  return output.value
}

suspend = async (coroutine, value) => {
  if (coroutine.status !== State.RUNNING) {
    throw Error('Expected an active coroutine to yield from!')
  }

  coroutine.status = State.SUSPENDED

  const output = {
    value: value,
    type: 'suspend'
  }

  if (coroutine.options.streamsMode !== StreamsMode.DISABLE) {
    const nextStream = await streams.push(coroutine.supplies, value)

    if (coroutine.options.streamsMode === StreamsMode.COLLECT) {
      coroutine.supplies = nextStream
    }
  }

  await channels.send(coroutine.supply, output)

  const input = await channels.receive(coroutine.demand)
  return input
}

status = coroutine => {
  validate(coroutine)
  return PrintState[coroutine.status]
}

demands = coroutine => {
  validate(coroutine)

  if (coroutine.options.streamsMode === StreamsMode.DISABLE) {
    throw Error('Coroutine created without supplies/demands streams!')
  }

  return coroutine.demands
}

supplies = coroutine => {
  validate(coroutine)

  if (coroutine.options.streamsMode === StreamsMode.DISABLE) {
    throw Error('Coroutine created without supplies/demands streams!')
  }

  return coroutine.supplies
}

complete = coroutine => {
  validate(coroutine)
  return coroutine.result.promise
}

module.exports.create = create
module.exports.resume = resume
module.exports.status = status
module.exports.supplies = supplies
module.exports.demands = demands
module.exports.complete = complete
