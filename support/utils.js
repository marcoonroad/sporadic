/* eslint-env node, es6, jest */

// @ts-check

'use strict'

/**
 * @function
 * @param {Promise<any>[]} promises
 * @returns
 */
const ignoreAll = (promises) => {
  return promises.map(function (promise) {
    return promise.catch(() => {
      // juntos e SHALLOW NOW
    })
  })
}

/**
 * @function
 * @param {Promise<any>[]} promises
 * @returns
 */
const ignorePromises = (promises) => {
  // hack / workaround to drop unhandled promise rejection warning
  return Promise.all(ignoreAll(promises))
}

/**
 * @function
 * @template T
 * @param {import("../types/sporadic").GenericStreamPullStep<T>} stream
 * @returns {Promise<T>}
 */
const extractValue = async (stream) => {
  const result = await stream

  // @ts-ignore
  return result.current
}

/**
 * @function
 * @template T
 * @param {import("../types/sporadic").GenericStreamPullStep<T>} stream
 * @returns {Promise<import("../types/sporadic").SporadicStream<T>>}
 */
const extractNext = async (stream) => {
  const result = await stream

  // @ts-ignore
  return result.next
}

const seconds = () =>
  Math.floor((new Date()).getTime() / 1000)

/**
 * @function
 * @param {number} since
 * @param {number} until
 * @returns
 */
const random = (since, until) =>
  Math.ceil((Math.random() * (until - since)) + since)

const randomDelay = () =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true)
    }, random(50, 100))
  })

module.exports.ignorePromises = ignorePromises
module.exports.extractValue = extractValue
module.exports.extractNext = extractNext
module.exports.seconds = seconds
module.exports.random = random
module.exports.randomDelay = randomDelay
