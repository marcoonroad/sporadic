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

const dispose = async coroutine => {
  coroutine.computation = true

  await utils.ignorePromise(channels.close(coroutine.supply))
  await utils.ignorePromise(channels.close(coroutine.demand))
  await utils.ignorePromise(streams.close(coroutine.demands))
  await utils.ignorePromise(streams.close(coroutine.supplies))

  return true
}

let create = null
let suspend = null
let resume = null
let status = null
let demands = null
let supplies = null
let complete = null

create = async computation => {
  const coroutine = {}

  coroutine.supplies = await streams.open()
  coroutine.demands = await streams.open()
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
  if (
    !coroutine || !coroutine.status || !coroutine.computation ||
    !coroutine.demands || !coroutine.supplies || !coroutine.supply ||
    !coroutine.demand || !coroutine.result
  ) {
    throw Error('Expected a valid coroutine!')
  }

  if (coroutine.status === State.RUNNING) {
    throw Error('Coroutine is already running!')
  } else if (coroutine.status === State.DEAD) {
    throw Error('Coroutine is dead!')
  }

  await streams.push(coroutine.demands, value)

  if (coroutine.status === State.CREATED) {
    coroutine.status = State.RUNNING
    coroutine.computation(value).then(result => {
      streams.push(coroutine.supplies, result).then(() => {
        channels.send(coroutine.supply, {
          value: result,
          type: 'return'
        })
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

  await streams.push(coroutine.supplies, value)
  await channels.send(coroutine.supply, output)

  const input = await channels.receive(coroutine.demand)
  return input
}

status = coroutine =>
  PrintState[coroutine.status]

demands = coroutine =>
  coroutine.demands

supplies = coroutine =>
  coroutine.supplies

complete = coroutine =>
  coroutine.result.promise

module.exports.create = create
module.exports.resume = resume
module.exports.status = status
module.exports.supplies = supplies
module.exports.demands = demands
module.exports.complete = complete
