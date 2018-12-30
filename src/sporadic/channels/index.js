/* eslint-env node, es6 */

'use strict'

const utils = require('../utils')

const error = () =>
  Error('Channel is closed!')

const breakDemands = channel => {
  // breaks all the pending receive calls
  while (channel.demands.length !== 0) {
    const demand = channel.demands.shift()

    demand.reject(error())
  }
}

const create = () => {
  const channel = {}

  channel.demands = []
  channel.supplies = []
  channel.closed = utils.defer()
  channel.isClosed = false

  return channel
}

const open = () => utils.resolved(create())

const send = (channel, message) => {
  if (channel.demands.length === 0) {
    // cannot push on closed channel
    if (channel.isClosed) {
      return utils.rejected(error())
    };

    const received = utils.defer()

    channel.supplies.push({ received, message })

    return received.promise
  } else {
    // close function will break all available demands,
    // so this path is never reached after close call
    const demand = channel.demands.shift()

    demand.resolve(message)

    return utils.resolved(true)
  }
}

const receive = channel => {
  // doesn't break on close if not empty
  if (channel.supplies.length === 0) {
    if (channel.isClosed) {
      return utils.rejected(error())
    }

    const demand = utils.defer()

    channel.demands.push(demand)

    return demand.promise
  } else {
    // closed non-empty streams don't break on receive
    const supply = channel.supplies.shift()

    supply.received.resolve(true)

    return utils.resolved(supply.message)
  }
}

const close = channel => {
  if (channel.isClosed) {
    return utils.resolved(false)
  }

  channel.isClosed = true

  breakDemands(channel)

  channel.closed.resolve(true)
  return utils.resolved(true)
}

const closed = channel =>
  channel.closed.promise

module.exports.open = open
module.exports.send = send
module.exports.receive = receive
module.exports.close = close
module.exports.closed = closed
