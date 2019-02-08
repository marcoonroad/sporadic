/* eslint-env node, es6 */

'use strict'

const defer = () => {
  const self = {}

  self.promise = new Promise((resolve, reject) => {
    self.resolve = resolve
    self.reject = reject
  })

  return self
}

const resolved = value =>
  new Promise(resolve => resolve(value))

const rejected = reason =>
  new Promise((resolve, reject) => reject(reason))

module.exports.defer = defer
module.exports.resolved = resolved
module.exports.rejected = rejected
