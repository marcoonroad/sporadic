/* eslint-env node, es6, jest */

'use strict'

const sporadic = require('../support').sporadic
const { open, send, receive, sendAfter, receiveAfter } = sporadic.channels
const timeoutError = { message: 'Timeout while listening channel!' }

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.clearAllTimers()
})

it('should handle timeouts on receive calls', async () => {
  expect.assertions(6)

  const channel = await open()
  const result1 = receive(channel, 0) // no block, check if there's a sent message
  const result2 = receive(channel, 3000)
  const result3 = receive(channel, 5000) // sorry, comes later

  const wasReceived1 = sendAfter(1500, channel, 'Hello! Sorry by being late...')

  jest.runOnlyPendingTimers()
  await expect(result1).rejects.toMatchObject(timeoutError)
  await expect(result2).resolves.toBe('Hello! Sorry by being late...')
  await expect(result3).rejects.toMatchObject(timeoutError)

  const wasReceived2 = send(channel, 'Yep, I arrive in time!')
  const result4 = receive(channel) //  blocks indefinitely

  await expect(result4).resolves.toBe('Yep, I arrive in time!')
  await expect(wasReceived1).resolves.toBe(true)
  await expect(wasReceived2).resolves.toBe(true)
})

it('should handle expirations on send calls', async () => {
  expect.assertions(4)

  const channel = await open()

  const wasReceived1 = send(channel, 'Hi Mike!', 2500)
  const wasReceived2 = send(channel, 'Hi Emily!', 1000)

  const result1 = receiveAfter(3000, channel)

  jest.runOnlyPendingTimers()
  const wasReceived3 = send(channel, 'Hi Mia!', 2000)

  await expect(wasReceived1).resolves.toBe(false)
  await expect(wasReceived2).resolves.toBe(false)
  await expect(wasReceived3).resolves.toBe(true)
  await expect(result1).resolves.toBe('Hi Mia!')
})

it('should mix timeouts, expirations & delays', async () => {
  const channel = await open()

  const result1 = receiveAfter(1500, channel)
  const wasReceived1 = sendAfter(3000, channel, 'Hey you!', 2000)
  const result2 = receive(channel, 2500)
  const result3 = receiveAfter(500, channel, 2000)
  const wasReceived2 = sendAfter(5000, channel, 'Oh no!')
  const wasReceived3 = sendAfter(10000, channel, 'No way!', 1000)
  const result4 = receiveAfter(5000, channel, 2000)

  jest.advanceTimersByTime(50) // 0 = t
  jest.advanceTimersByTime(500) // 500 = t
  jest.advanceTimersByTime(1000) // 1500 = t
  jest.advanceTimersByTime(1000) // 2500 = t
  await expect(result2).rejects.toMatchObject(timeoutError)
  await expect(result3).rejects.toMatchObject(timeoutError)

  jest.advanceTimersByTime(500) // 3000 = t
  await expect(result1).resolves.toBe('Hey you!')
  await expect(wasReceived1).resolves.toBe(true)

  jest.advanceTimersByTime(2000) // 5000 = t
  await expect(result4).resolves.toBe('Oh no!')
  await expect(wasReceived2).resolves.toBe(true)

  jest.advanceTimersByTime(5000) // 10000 = t
  jest.advanceTimersByTime(1500) // 11500 = t
  await expect(wasReceived3).resolves.toBe(false)
})
