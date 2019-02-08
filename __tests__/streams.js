/* eslint-env node, es6, jest */

'use strict'

const LIB_DIR = process.env.LIB_DIR || 'src'
const {
  open, push, pull, close
} = require(`../${LIB_DIR}/sporadic`).streams

// hack / workaround to drop unhandled promise rejection warning
const ignorePromises = (promises) => {
  return Promise.all(promises).catch(() => { })
}

const extractValue = async (stream) => {
  const result = await stream

  return result.current
}

const extractNext = async (stream) => {
  const result = await stream

  return result.next
}

it('should open streams', async () => {
  expect.assertions(3)

  const producerA = await open()
  const producerB = await open()
  const producerC = await open()

  expect(producerA).not.toBe(producerB)
  expect(producerA).not.toBe(producerC)
  expect(producerB).not.toBe(producerC)
})

it('should open & push streams', async () => {
  expect.assertions(3)

  const producer0 = await open()
  const producer1 = await push(producer0, 'whatever')
  const producer2 = await push(producer1, 'yet another stuff')

  expect(producer1).not.toBe(producer0)
  expect(producer2).not.toBe(producer1)
  expect(producer2).not.toBe(producer0)
})

it('should open, push & pull streams', async () => {
  expect.assertions(8)

  const producer0 = await open()
  const consumer0 = producer0

  // it doesn't matter to push on the
  // same stream always
  const producer1 = await push(producer0, 5)
  const producer2 = await push(producer0, 12)
  const producer3 = await push(producer0, 14)
  const producer4 = await push(producer0, 7)

  const result1 = await pull(consumer0)
  const result2 = await pull(result1.next)
  const result3 = await pull(result2.next)
  const result4 = await pull(result3.next)

  expect(result1.next).toBe(producer1)
  expect(result2.next).toBe(producer2)
  expect(result3.next).toBe(producer3)
  expect(result4.next).toBe(producer4)

  expect(result1.current).toBe(5)
  expect(result2.current).toBe(12)
  expect(result3.current).toBe(14)
  expect(result4.current).toBe(7)
})

it('should open, push, pull & close streams', async () => {
  expect.assertions(6)

  const producer0 = await open()
  const consumer0 = producer0

  const promise1 = pull(consumer0)
  const producer1 = await push(producer0, 'OK!')
  const result1 = await promise1

  const promise2 = close(producer1, 'NOT OK!')
  const promise3 = pull(result1.next)
  const promise4 = push(producer1, 'IGNORED VALUE.')

  // only the first close wins, further ones are ignored
  const promise5 = close(producer1, 'IGNORED ERROR MESSAGE!')
  const promise6 = close(producer1, 'STILL IGNORED ERROR!')

  expect(result1.current).toBe('OK!')

  await expect(promise2).rejects.toBe('NOT OK!')
  await expect(promise3).rejects.toBe('NOT OK!')
  await expect(promise4).rejects.toBe('NOT OK!')
  await expect(promise5).rejects.toBe('NOT OK!')
  await expect(promise6).rejects.toBe('NOT OK!')

  ignorePromises([ promise2, promise3, promise4, promise5, promise6 ])
})

it('should replay the pull for the same stream point', async () => {
  expect.assertions(8)

  const stream = await open()

  const nextStream = await push(stream, 99)

  expect(extractValue(stream)).resolves.toBe(99)
  expect(extractValue(stream)).resolves.toBe(99)
  expect(extractValue(stream)).resolves.toBe(99)
  expect(await extractNext(stream)).toBe(await extractNext(stream))

  await push(nextStream, 18)

  expect(extractValue(nextStream)).resolves.toBe(18)
  expect(extractValue(nextStream)).resolves.toBe(18)
  expect(extractValue(nextStream)).resolves.toBe(18)
  expect(await extractNext(nextStream)).toBe(await extractNext(nextStream))
})

it('should be able to discard stream points', async () => {
  expect.assertions(3)

  const stream = await open()

  let producerPoint = stream
  for (let step = 0; step < 5; step += 1) {
    const message = `Hello, World (step #${step + 1})!`
    producerPoint = await push(producerPoint, message)
  }

  let consumerPoint = stream
  for (let step = 0; step < 3; step += 1) {
    const { next, current } = await pull(consumerPoint)

    expect(current).toBe(`Hello, World (step #${step + 1})!`)
    consumerPoint = next
  }
})
