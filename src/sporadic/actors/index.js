/* eslint-env node, es6 */

// @ts-check

'use strict'

const tasks = require('../tasks')

/**
 * @function
 * @param {Object} object
 * @returns {Object}
 */
const create = object => {
  const handler = {}
  let revoke = () => { }
  handler.deleteObject = (_target, property) => {
    if (property === 'kill') {
      throw new Error('Cannot delete reserved keyword/property called [kill]')
    }
    delete object[ property ]
    return true
  }
  handler.set = (_target, property, value) => {
    if (property === 'kill') {
      throw new Error('Cannot override reserved keyword/property called [kill]')
    }
    object[ property ] = value
    return true
  }
  handler.get = (_target, property, receiver) => {
    if (property === 'kill') {
      return (...values) => {
        revoke()
      }
    }
    const value = object[property]
    if (value instanceof Function) {
      return function (...values) {
        const thisObject = this
        return tasks.spawn(async () => value.apply(thisObject === receiver ? object : thisObject, values))
      }
    } else if (property !== 'fallback' && (value === null || value === undefined)) {
      const fallback = object.fallback
      if (fallback instanceof Function) {
        return function (...values) {
          const thisObject = this
          return fallback.apply(thisObject === receiver ? object : thisObject, [ property, ...values ])
        }
      } else {
        return value
      }
    } else {
      return value
    }
  }
  const revocable = Proxy.revocable({}, handler)
  revoke = revocable.revoke
  return revocable.proxy
}

module.exports.create = create
