/* eslint-env node, es6 */

// @ts-check

'use strict'

const tasks = require('../tasks')

const closeError = () =>
  Error('Channel is closed!')

const timeoutError = () =>
  Error('Timeout while listening channel!')

/**
 * @typedef {Object} SporadicInternalSupply
 * @property {import('../tasks').SporadicDeferred<any>} received
 * @property {any} message
 */

/**
 * @typedef {Object} SporadicInternalChannel
 * @property {import('../tasks').SporadicDeferred<any>[]} demands
 * @property {SporadicInternalSupply[]} supplies
 * @property {import('../tasks').SporadicDeferred<boolean>} closed
 * @property {boolean} isClosed
 */

/**
 * @function
 * @param {SporadicInternalChannel} channel
 * @returns
 */
const breakDemands = channel => {
  // breaks all the pending receive calls
  while (channel.demands.length !== 0) {
    const demand = channel.demands.shift()
    if (demand === null || demand === undefined) break;
    demand.reject(closeError()) // no-op if demand defer is changed
  }
}

const create = () => {
  /**
   * @type {SporadicInternalChannel}
   */
  const channel = {}

  channel.demands = []
  channel.supplies = []
  channel.closed = tasks.defer()
  channel.isClosed = false

  return channel
}

const open = () => Promise.resolve(create())

/**
 * @type {(channel: SporadicInternalChannel, message: any, expiration?: number) => Promise<any>}
 */
let send
send = (channel, message, expiration) => {
  if (channel.demands.length === 0) {
    // cannot push on closed channel
    if (channel.isClosed) {
      return Promise.reject(closeError())
    };

    const received = tasks.defer()

    if (
      (expiration !== undefined) &&
      (expiration !== null) &&
      (typeof expiration === 'number') &&
      (expiration >= 1)
    ) {
      setTimeout(() => {
        received.resolve(false)
      }, Math.floor(expiration))
    }

    channel.supplies.push({ received, message })

    return received.promise
  } else {
    // close function will break all available demands,
    // so this path is never reached after close call
    let demand = channel.demands.shift()

    while (channel.demands.length > 0 && !!demand && demand.changed) {
      demand = channel.demands.shift()
    }

    if (!!demand && demand.changed) {
      return send(channel, message) // recursion me
    }

    if (!!demand) {
      demand.resolve(message)
    }

    return Promise.resolve(true)
  }
}

/**
 * @type {(channel: SporadicInternalChannel, timeout?: number) => Promise<any>}
 */
let receive
receive = (channel, timeout) => {
  // doesn't break on close if not empty
  if (channel.supplies.length === 0) {
    if (channel.isClosed) {
      return Promise.reject(closeError())
    }

    const demand = tasks.defer()

    channel.demands.push(demand)

    if (
      (timeout !== undefined) &&
      (timeout !== null) &&
      (typeof timeout === 'number') &&
      (timeout >= 0)
    ) {
      setTimeout(() => {
        demand.reject(timeoutError())
      }, Math.floor(timeout))
    }

    return demand.promise
  } else {
    // closed non-empty streams don't break on receive
    let supply = channel.supplies.shift()

    while (channel.supplies.length > 0 && !!supply && supply.received.changed) {
      supply = channel.supplies.shift()
    }

    if (!!supply && supply.received.changed) {
      return receive(channel, timeout) // recursion me
    }

    if (supply === null || supply === undefined) {
      throw new Error('FATAL CRASH ERROR')
    }
    else {
      supply.received.resolve(true)

      return Promise.resolve(supply.message)
    }
  }
}

/**
 * @function
 * @param {SporadicInternalChannel} channel
 * @returns
 */
const close = channel => {
  if (channel.isClosed) {
    return Promise.resolve(false)
  }

  channel.isClosed = true

  breakDemands(channel)

  channel.closed.resolve(true)
  return Promise.resolve(true)
}

/**
 * @function
 * @param {SporadicInternalChannel} channel
 * @returns
 */
const closed = channel =>
  channel.closed.promise

/**
 * @function
 * @param {number} delay
 * @param {SporadicInternalChannel} channel
 * @param {any} message
 * @param {number} [expiration]
 * @returns
 */
const sendAfter = (delay, channel, message, expiration) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      send(channel, message, expiration).then(resolve, reject)
    }, Math.floor(Math.max(0, delay)))
  })

/**
 * @function
 * @param {number} delay
 * @param {SporadicInternalChannel} channel
 * @param {number} [timeout]
 * @returns
 */
const receiveAfter = (delay, channel, timeout) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      receive(channel, timeout).then(resolve, reject)
    }, Math.floor(Math.max(0, delay)))
  })

module.exports._create = create
module.exports.open = open
module.exports.send = send
module.exports.receive = receive
module.exports.close = close
module.exports.closed = closed
module.exports.sendAfter = sendAfter
module.exports.receiveAfter = receiveAfter
