/* eslint-env node, es6, jest */

'use strict'

jest.useFakeTimers()

const sporadic = require('../support').sporadic
const { open, send, receive } = sporadic.channels
const timeoutError = { message: 'Timeout while listening channel!' }

it('should handle timeouts on receive calls', async () => {
  expect.assertions(5)

  const channel = await open()
  const result1 = receive(channel, 0) // no block, check if there's a sent message
  const result2 = receive(channel, 3000)
  const result3 = receive(channel, 5000) // sorry, comes later

  setTimeout(() => {
    send(channel, 'Hello! Sorry by being late...')
  }, 1500)

  jest.runOnlyPendingTimers()
  await expect(result1).rejects.toMatchObject(timeoutError)
  await expect(result2).resolves.toBe('Hello! Sorry by being late...')
  await expect(result3).rejects.toMatchObject(timeoutError)

  const wasReceived = send(channel, 'Yep, I arrive in time!')
  const result4 = receive(channel) //  blocks indefinitely

  await expect(result4).resolves.toBe('Yep, I arrive in time!')
  await expect(wasReceived).resolves.toBe(true)
})

it('should handle expirations on send calls', async () => {
  expect.assertions(4)

  const channel = await open()

  const wasReceived1 = send(channel, 'Hi Mike!', 2500)
  const wasReceived2 = send(channel, 'Hi Emily!', 1000)

  const result1 = new Promise((resolve, reject) => {
    setTimeout(() => {
      receive(channel).then(resolve).catch(reject)
    }, 3000)
  })

  jest.runOnlyPendingTimers()
  const wasReceived3 = send(channel, 'Hi Mia!', 2000)

  await expect(wasReceived1).resolves.toBe(false)
  await expect(wasReceived2).resolves.toBe(false)
  await expect(wasReceived3).resolves.toBe(true)
  await expect(result1).resolves.toBe('Hi Mia!')
})
