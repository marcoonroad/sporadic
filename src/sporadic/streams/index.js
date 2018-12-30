/* eslint-env node, es6 */

'use strict'

const utils = require('../utils')

// needed to perform asynchronous recursion, see function below
let create = null

create = () => {
  const { promise, resolve, reject } = utils.defer()

  const produced = false
  const next = promise.then(create)

  const stream = {
    current: promise,
    next,
    resolve,
    reject,
    produced
  }

  return stream
}

// unit -> stream promise
const open = () => utils.resolved(create())

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

  while (point.produced) {
    const { next } = await pull(point)

    point = next
  }

  return point
}

// stream * value -> stream promise
const push = async (stream, value) => {
  const point = await available(stream)

  point.resolve(value)
  point.produced = true

  const result = await point.next

  return result
}

// stream * reason -> void promise
// never returns, throws reason
const close = async (stream, reason) => {
  const point = await available(stream)

  point.reject(reason)
  point.produced = true

  throw reason
}

module.exports.open = open
module.exports.push = push
module.exports.pull = pull
module.exports.close = close
