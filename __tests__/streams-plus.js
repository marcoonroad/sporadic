/* eslint-env jest, es6, node */

'use strict'

const support = require('../support')
const sporadic = support.sporadic
const utils = support.utils

const {
  every, close, push, open, react, map, pull, filter
} = sporadic.streams

// hack / workaround to drop unhandled promise rejection warning
const ignorePromises = utils.ignorePromises
const extractValue = utils.extractValue
const extractNext = utils.extractNext

const closedErrorObject = { message: 'Stream is closed!' }

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.clearAllTimers()
})

it('should tick events during some interval', async () => {
  expect.assertions(4)

  const ticker1 = every(3000)
  const value1 = extractValue(ticker1)
  jest.advanceTimersByTime(3050)
  await expect(value1).resolves.toBe(true)

  const ticker2 = await extractNext(ticker1)
  const value2 = extractValue(ticker2)
  jest.advanceTimersByTime(3050)
  await expect(value2).resolves.toBe(true)

  const ticker3 = await extractNext(ticker2)
  const value3 = extractValue(ticker3)
  jest.advanceTimersByTime(3050)
  await expect(value3).resolves.toBe(true)

  const closed = close(ticker3)
  await expect(closed).rejects.toMatchObject(closedErrorObject)

  ignorePromises([ closed ])
})

it('should react to sent events', async () => {
  expect.assertions(6)

  let stream = await open()

  let state = 0
  const isClosed = react(stream, value => {
    expect(value).toBe(state)
    state += 1
  })

  for (let counter = 0; counter < 4; counter += 1) {
    stream = await push(stream, counter)
  }

  await expect(close(stream)).rejects.toMatchObject(closedErrorObject)
  await expect(isClosed).resolves.toBe(true)
})

it('should break reaction loop if one step fails', async () => {
  expect.assertions(2)

  const stream = await open()

  const isClosed = react(stream, value => {
    throw Error('Oops! Operation failed...')
  })

  await push(stream, 12)

  await expect(isClosed).rejects.toMatchObject({
    message: 'Oops! Operation failed...'
  })

  await expect(close(stream)).rejects.toMatchObject(closedErrorObject)
})

it('should map/transform stream values', async () => {
  expect.assertions(5)

  const closure = value => {
    return value * 2
  }

  let producer = await open()
  let consumer = await map(producer, closure)

  producer = await push(producer, 5)
  producer = await push(producer, 8)
  producer = await push(producer, 10)

  await expect(extractValue(pull(consumer))).resolves.toBe(10)
  consumer = await extractNext(pull(consumer))

  await expect(extractValue(pull(consumer))).resolves.toBe(16)
  consumer = await extractNext(pull(consumer))

  await expect(extractValue(pull(consumer))).resolves.toBe(20)

  await expect(close(producer)).rejects.toMatchObject(closedErrorObject)
  await expect(close(consumer)).rejects.toMatchObject(closedErrorObject)
})

it('should close the result stream if a map step fails', async () => {
  expect.assertions(3)

  const closure = () => {
    throw Error('OH NO!')
  }

  let producer = await open()
  let consumer = await map(producer, closure)

  producer = await push(producer, 5)

  const value = extractValue(pull(consumer))
  await expect(value).rejects.toMatchObject(closedErrorObject)

  await expect(close(producer)).rejects.toMatchObject(closedErrorObject)
  await expect(close(consumer)).rejects.toMatchObject(closedErrorObject)
})

it('should close result stream if the origin one is closed before', async () => {
  expect.assertions(2)

  const closure = value => value.toString() + value.toString()

  const producer = await open()
  const consumer = await map(producer, closure)

  await expect(close(producer)).rejects.toMatchObject(closedErrorObject)

  const value = extractValue(pull(consumer))
  await expect(value).rejects.toMatchObject(closedErrorObject)
})

it('should not map origin values if result stream is closed before', async () => {
  expect.assertions(4)

  const closure = value => value + 1
  const producer = await open()
  const consumer = await map(producer, closure)

  await expect(close(consumer)).rejects.toMatchObject(closedErrorObject)
  const value1 = extractValue(pull(consumer))
  await expect(value1).rejects.toMatchObject(closedErrorObject)

  await push(producer, 15)

  const value2 = extractValue(pull(consumer))
  await expect(value2).rejects.toMatchObject(closedErrorObject)

  await expect(close(producer)).rejects.toMatchObject(closedErrorObject)
})

it('should filter stream values', async () => {
  const predicate = value => (value % 2) === 0

  let producer = await open()
  let filtered = await filter(producer, predicate)

  for (let counter = 1; counter <= 10; counter += 1) {
    producer = await push(producer, counter)
  }

  let result = await pull(filtered)
  expect(result.current).toBe(2)
  filtered = result.next

  result = await pull(filtered)
  expect(result.current).toBe(4)
  filtered = result.next

  result = await pull(filtered)
  expect(result.current).toBe(6)
  filtered = result.next

  result = await pull(filtered)
  expect(result.current).toBe(8)
  filtered = result.next

  result = await pull(filtered)
  expect(result.current).toBe(10)
  filtered = result.next
})

it('should close filtered stream if the origin one is closed before', async () => {
  expect.assertions(2)

  const predicate = value => value.length >= 10
  const producer = await open()
  const filtered = await filter(producer, predicate)

  await expect(close(producer)).rejects.toMatchObject(closedErrorObject)

  const value = extractValue(pull(filtered))
  await expect(value).rejects.toMatchObject(closedErrorObject)
})

it('should close filtered stream if a filter step fails', async () => {
  expect.assertions(2)

  const predicate = () => {
    throw Error('SH*T!')
  }

  const producer = await open()
  const filtered = await filter(producer, predicate)

  await push(producer, { id: 15, username: 'ammber' })

  const value = extractValue(pull(filtered))
  await expect(value).rejects.toMatchObject(closedErrorObject)

  await expect(close(producer)).rejects.toMatchObject(closedErrorObject)
})

it('should ignore sent values from origin if filtered is close', async () => {
  expect.assertions(3)

  const predicate = value => value.status === 'PROCESSED'
  const producer = await open()
  const filtered = await filter(producer, predicate)

  await expect(close(filtered)).rejects.toMatchObject(closedErrorObject)

  await push(producer, { status: 'PROCESSED' })
  const value = extractValue(pull(filtered))
  await expect(value).rejects.toMatchObject(closedErrorObject)

  await expect(close(producer)).rejects.toMatchObject(closedErrorObject)
})
