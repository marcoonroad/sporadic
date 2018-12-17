/* eslint-env node, es6, jest */

const { open, push, pull, close } = require('sporadic').streams

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
  expect.assertions(3)

  const producer0 = await open()
  const consumer0 = producer0

  const promise1 = pull(consumer0)
  const producer1 = await push(producer0, 'OK!')
  const result1 = await promise1

  const promise2 = close(producer1, 'NOT OK!')
  const promise3 = pull(result1.next)

  expect(result1.current).toBe('OK!')

  await expect(promise2).rejects.toBe('NOT OK!')
  await expect(promise3).rejects.toBe('NOT OK!')

  // hack / workaround to drop unhandled promise rejection warning
  Promise.all([ promise2, promise3 ]).catch(() => { })
})
