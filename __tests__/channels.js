/* eslint-env node, es6, jest */

'use strict'

const { open, send, receive, close, closed } = require('../src/sporadic').channels

it('should open fresh channels', async () => {
  expect.assertions(3)

  const channel1 = await open()
  const channel2 = await open()
  const channel3 = await open()

  expect(channel1).not.toBe(channel2)
  expect(channel2).not.toBe(channel3)
  expect(channel3).not.toBe(channel1)
})

it('should open & close channels', async () => {
  expect.assertions(7)

  const channel = await open()

  const receivePromise = receive(channel)
  const closedPromise = closed(channel)

  const closePromise01 = close(channel)
  const closePromise02 = close(channel)
  const closePromise03 = close(channel)

  await expect(receivePromise).rejects.toBeDefined()
  await expect(closedPromise).resolves.toBe(true)

  await expect(send(channel, 'Oops!')).rejects.toBeDefined()
  await expect(receive(channel)).rejects.toBeDefined()

  await expect(closePromise01).resolves.toBe(true)
  await expect(closePromise02).resolves.toBe(false)
  await expect(closePromise03).resolves.toBe(false)
})

it('should send and receive over open channels', async () => {
  expect.assertions(9)
  const channel = await open()

  const sent1 = send(channel, 8)
  const sent2 = send(channel, 17)
  const received1 = receive(channel)
  const received2 = receive(channel)
  const received3 = receive(channel)
  const sent3 = send(channel, 23)
  const sent4 = send(channel, 2)
  const received4 = receive(channel)

  await expect(received1).resolves.toBe(8)
  await expect(received2).resolves.toBe(17)
  await expect(received3).resolves.toBe(23)
  await expect(received4).resolves.toBe(2)

  await expect(sent1).resolves.toBe(true)
  await expect(sent2).resolves.toBe(true)
  await expect(sent3).resolves.toBe(true)
  await expect(sent4).resolves.toBe(true)

  await close(channel)
  await expect(closed(channel)).resolves.toBe(true)
})
