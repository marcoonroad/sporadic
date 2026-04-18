/* eslint-env node, es6 */

// @ts-check

'use strict'

/**
 * @function
 * @template T
 * @param {T} _value
 * @returns
 */
const ignoreValue = _value => { }


/**
 * @function
 * @template T
 * @param {() => T | void | Promise<T> | Promise<void>} block
 * @returns {Promise<T | void | null>}
 */
const spawn = block => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const blockWrapper = async () => block()
        const result = await blockWrapper()

        /** @type {any} */
        const dynamicResult = result

        const finalResult = await dynamicResult
        resolve(finalResult)
      } catch (reason) {
        reject(reason)
      }
    }, 1)
  })
}

/**
 * @function
 * @param {number} seconds
 * @returns {Promise<number>}
 */
const delay = (seconds) => {
  if (seconds < 0) {
    throw new Error(`Invalid amount of seconds: ${seconds}`)
  }
  return new Promise((resolve, reject) => {
    const startTime = (new Date()).getTime() / 1000
    setTimeout(() => {
      const endTime = (new Date()).getTime() / 1000
      resolve(endTime - startTime)
    }, seconds * 1000)
  })
}

/**
 * @function
 * @param {number} seconds
 * @returns {Promise<never>}
 */
const timeout = (seconds) => {
  if (seconds < 0) {
    throw new Error(`Invalid amount of seconds: ${seconds}`)
  }
  return new Promise((resolve, reject) => {
    const startTime = (new Date()).getTime() / 1000
    setTimeout(() => {
      const endTime = (new Date()).getTime() / 1000
      reject(Error(`Timed out after ${endTime - startTime} seconds`))
    }, seconds * 1000)
  })
}

/**
 * @template T
 * @typedef {object} SporadicDeferred<T>
 * @property {(value: T) => void} resolve
 * @property {(reason: any) => void} reject
 * @property {Promise<T>} promise
 */

/**
 * @function
 * @template T
 * @returns {SporadicDeferred<T>}
 */
const defer = () => {
  const internal = {
    resolve: ignoreValue,
    reject: ignoreValue,
  }
  const result = {}

  result.changed = false
  result.broken = false

  result.promise = new Promise((resolve, reject) => {
    internal.resolve = resolve
    internal.reject = reject
  })

  /**
   * @function
   * @template T
   * @param {T} value
   * @returns
   */
  result.resolve = (value) => {
    if (result.changed) {
      return
    }

    result.changed = true
    internal.resolve(value)
  }

  /**
   * @function
   * @template T
   * @param {T} reason
   * @returns
   */
  result.reject = (reason) => {
    if (result.changed) {
      return
    }

    result.changed = true
    result.broken = true
    internal.reject(reason)
  }

  return result
}

/**
 * @function
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<boolean>}
 */
const ignore = promise =>
  promise.then(() => true).catch(() => true)

const already = () => Promise.resolve()
const never = () => new Promise((resolve, reject) => { })

module.exports.already = already
module.exports.never = never
module.exports.spawn = spawn
module.exports.defer = defer
module.exports.delay = delay
module.exports.timeout = timeout
module.exports.ignore = ignore
