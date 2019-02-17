/* eslint-env node, es6 */

'use strict'

const utils = require('../utils')

const closeError = () =>
  Error('Channel is closed!')

const timeoutError = () =>
  Error('Timeout while listening channel!')

const breakDemands = channel => {
  // breaks all the pending receive calls
  while (channel.demands.length !== 0) {
    const demand = channel.demands.shift()

    demand.reject(closeError())
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

let send = null

send = (channel, message) => {
  if (channel.demands.length === 0) {
    // cannot push on closed channel
    if (channel.isClosed) {
      return utils.rejected(closeError())
    };

    const received = utils.defer()

    channel.supplies.push({ received, message })

    return received.promise
  } else {
    // close function will break all available demands,
    // so this path is never reached after close call
    let demand = channel.demands.shift()

    while (channel.demands.length > 0 && demand.changed) {
      demand = channel.demands.shift()
    }

    if (demand.changed) {
      return send(channel, message) // recursion me
    }

    demand.resolve(message)

    return utils.resolved(true)
  }
}

const receive = (channel, timeout) => {
  // doesn't break on close if not empty
  if (channel.supplies.length === 0) {
    if (channel.isClosed) {
      return utils.rejected(closeError())
    }

    const demand = utils.defer()

    channel.demands.push(demand)

    if (
      (timeout !== undefined) &&
      (timeout !== null) &&
      (typeof timeout === 'number') &&
      (timeout >= 0)
    ) {
      setTimeout(() => {
        demand.reject(timeoutError())
      }, timeout)
    }

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
