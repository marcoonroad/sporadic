/* eslint-env node, es6 */

'use strict'

const utils = require('../utils')
const channels = require('../channels')

const State = {
  CREATED: 1,
  RUNNING: 2,
  DEAD: 3
}

const PrintState = [
  '<undefined>',
  'CREATED',
  'RUNNING',
  'DEAD'
]

const closeError = () =>
  Error('Actor is closed!')

const timeoutError = () =>
  Error('Timeout while waiting actor reply!')

const validate = actor => {
  if (
    !actor || !actor.behavior || !actor.mailbox || !actor.result ||
    !(actor.result.promise instanceof Promise)
  ) {
    throw Error('Expected a valid actor!')
  }
}

const settlePending = (actor, reason) => {
  while (actor.mailbox.supplies.length !== 0) {
    const supply = actor.mailbox.supplies.shift()
    const envelope = supply.message

    if (envelope && envelope.reply) {
      envelope.reply.reject(reason)
    }

    supply.received.resolve(false)
  }
}

const start = async (actor) => {
  actor.status = State.RUNNING

  try {
    while (true) {
      const envelope = await channels.receive(actor.mailbox)

      try {
        const output = await actor.behavior(envelope.message)

        if (envelope.reply) {
          envelope.reply.resolve(output)
        }
      } catch (reason) {
        if (envelope.reply) {
          envelope.reply.reject(reason)
        }

        throw reason
      }
    }
  } catch (reason) {
    const isClosed = reason && reason.message === 'Channel is closed!'
    const error = isClosed ? closeError() : reason

    await utils.ignorePromise(channels.close(actor.mailbox))
    settlePending(actor, error)
    actor.status = State.DEAD

    if (isClosed) {
      actor.result.resolve(true)
    } else {
      actor.result.reject(error)
    }
  }
}

const spawn = async (behavior, nullableOptions) => {
  if (typeof behavior !== 'function') {
    throw Error('Expected an actor behavior function!')
  }

  const actor = {}
  const options = nullableOptions || {}

  actor.options = options
  actor.mailbox = await channels.open()
  actor.result = utils.defer()
  actor.status = State.CREATED
  actor.behavior = behavior

  const self = {
    status: () => status(actor),
    stop: () => stop(actor),
    tell: (message, expiration) => tell(actor, message, expiration),
    ask: (message, expiration) => ask(actor, message, expiration),
    closed: () => closed(actor),
    complete: () => complete(actor)
  }

  actor.behavior = behavior.bind(self)

  utils.ignorePromise(start(actor))

  return actor
}

const tell = async (actor, message, expiration) => {
  validate(actor)

  if (actor.status === State.DEAD || actor.mailbox.isClosed) {
    return utils.rejected(closeError())
  }

  return channels.send(actor.mailbox, {
    message,
    type: 'tell'
  }, expiration)
}

const ask = async (actor, message, expiration) => {
  validate(actor)

  if (actor.status === State.DEAD || actor.mailbox.isClosed) {
    return utils.rejected(closeError())
  }

  const reply = utils.defer()
  const sent = await channels.send(actor.mailbox, {
    message,
    reply,
    type: 'ask'
  }, expiration)

  if (!sent) {
    throw timeoutError()
  }

  return reply.promise
}

const stop = actor => {
  validate(actor)
  return channels.close(actor.mailbox)
}

const closed = actor => {
  validate(actor)
  return channels.closed(actor.mailbox)
}

const status = actor => {
  validate(actor)
  return PrintState[actor.status]
}

const complete = actor => {
  validate(actor)
  return actor.result.promise
}

module.exports.create = spawn
module.exports.spawn = spawn
module.exports.tell = tell
module.exports.send = tell
module.exports.ask = ask
module.exports.stop = stop
module.exports.closed = closed
module.exports.status = status
module.exports.complete = complete
