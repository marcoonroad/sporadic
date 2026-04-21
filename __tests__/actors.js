/* eslint-env jest, es6, node */

'use strict'

const sporadic = require('../support').sporadic

const {
  spawn, tell, ask, stop, closed, status, complete
} = sporadic.actors

const closedErrorObject = { message: 'Actor is closed!' }

it('should spawn an actor and process messages sequentially', async () => {
  expect.assertions(8)

  let total = 0

  const actor = await spawn(async function (message) {
    total += message
    return total
  })

  const completion = complete(actor)

  expect(status(actor)).toBe('RUNNING')
  await expect(tell(actor, 2)).resolves.toBe(true)
  await expect(ask(actor, 3)).resolves.toBe(5)
  await expect(ask(actor, 7)).resolves.toBe(12)
  await expect(stop(actor)).resolves.toBe(true)
  await expect(closed(actor)).resolves.toBe(true)
  await expect(completion).resolves.toBe(true)
  expect(status(actor)).toBe('DEAD')
})

it('should close an actor when the handler fails', async () => {
  expect.assertions(6)

  const actor = await spawn(async function (message) {
    if (message === 'boom') {
      throw Error('I am broken!')
    }

    return message
  })

  const completion = complete(actor)
  completion.catch(() => {
    // swallow so Jest doesn't flag the rejection before the assertion below
  })

  await expect(ask(actor, 'boom')).rejects.toMatchObject({
    message: 'I am broken!'
  })

  await expect(closed(actor)).resolves.toBe(true)
  await expect(tell(actor, 'later')).rejects.toMatchObject(closedErrorObject)
  await expect(stop(actor)).resolves.toBe(false)
  await expect(completion).rejects.toMatchObject({
    message: 'I am broken!'
  })
  expect(status(actor)).toBe('DEAD')
})

it('should expose actor helpers through this', async () => {
  expect.assertions(4)

  const actor = await spawn(async function (message) {
    const state = this.status()

    if (message === 'stop') {
      await this.stop()
    }

    return state
  })

  const completion = complete(actor)

  await expect(ask(actor, 'stop')).resolves.toBe('RUNNING')
  await expect(closed(actor)).resolves.toBe(true)
  await expect(completion).resolves.toBe(true)
  expect(status(actor)).toBe('DEAD')
})
