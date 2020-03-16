/* eslint-env node, es6, jest */

'use strict'

const { sporadic, utils } = require('../support')

const { coroutines, streams } = sporadic

it('should listen for coroutine supplies & demands', async () => {
  expect.assertions(11)

  let coroutine = null
  coroutine = await coroutines.create(async function (number) {
    expect(this.supplies()).toBe(coroutines.supplies(coroutine))
    expect(this.demands()).toBe(coroutines.demands(coroutine))

    let sum = 0

    for (let index = 1; index <= 5; index += 1) {
      await utils.randomDelay()
      sum += await this.suspend(number * index)
    }

    return sum
  })

  const supplies = coroutines.supplies(coroutine)
  const demands = coroutines.demands(coroutine)

  const expectedSupplies = [2, 4, 6, 8, 10, 17]
  const expectedDemands = [2, 7, 3, 6, 2, -1]
  const currentSupplies = []
  const currentDemands = []

  streams.react(supplies, currentSupplies.push.bind(currentSupplies))
  streams.react(demands, currentDemands.push.bind(currentDemands))

  for (let index = 0; index < expectedDemands.length; index += 1) {
    const input = expectedDemands[index]
    const output = await coroutines.resume(coroutine, input)

    expect(output).toBe(expectedSupplies[index])
  }

  await expect(coroutines.complete(coroutine)).resolves.toBe(17)

  expect(currentDemands).toEqual(expectedDemands)
  expect(currentSupplies).toEqual(expectedSupplies)
})

it('should move stream points on options.streamsMode=COLLECT', async () => {
  expect.assertions(12)

  let coroutine = null
  coroutine = await coroutines.create(async function (initialCounter) {
    let counter = initialCounter

    const suppliesA = this.supplies()
    const demandsA = this.demands()

    counter += 1
    counter += await this.suspend(counter)

    const suppliesB = this.supplies()
    const demandsB = this.demands()

    counter = counter * 2
    counter = counter - (await this.suspend(counter))

    const suppliesC = this.supplies()
    const demandsC = this.demands()

    return {
      counter,
      suppliesA,
      suppliesB,
      suppliesC,
      demandsA,
      demandsB,
      demandsC
    }
  }, { streamsMode: 'COLLECT' })

  const supplies1 = coroutines.supplies(coroutine)
  const demands1 = coroutines.demands(coroutine)
  const result1 = await coroutines.resume(coroutine, 15)
  expect(result1).toBe(16)

  const supplies2 = coroutines.supplies(coroutine)
  const demands2 = coroutines.demands(coroutine)
  const result2 = await coroutines.resume(coroutine, 4)
  expect(result2).toBe(40)

  const supplies3 = coroutines.supplies(coroutine)
  const demands3 = coroutines.demands(coroutine)
  const {
    counter,
    suppliesA,
    suppliesB,
    suppliesC,
    demandsA,
    demandsB,
    demandsC
  } = await coroutines.resume(coroutine, 37)
  expect(counter).toBe(3)
  const demands4 = coroutines.demands(coroutine)

  expect(supplies1).toBe(suppliesA)
  expect(supplies2).toBe(suppliesB)
  expect(supplies3).toBe(suppliesC)
  expect(demands1).not.toBe(demandsA)
  expect(demands2).not.toBe(demandsB)
  expect(demands3).not.toBe(demandsC)
  expect(demands2).toBe(demandsA)
  expect(demands3).toBe(demandsB)
  expect(demands4).toBe(demandsC)
})

it('should mix many coroutine behaviors', async () => {
  expect.assertions(14)

  let coroutine1 = null
  let coroutine2 = null
  let coroutine3 = null
  let coroutine4 = null
  let coroutine5 = null

  coroutine1 = await coroutines.create(async function () {
    const result = await coroutines.complete(coroutine3)

    expect(result).toBe('OH NO')

    await utils.randomDelay()

    await expect(coroutines.resume(coroutine2)).resolves
      .toBe('Coroutine 2 is done!')

    await expect(coroutines.complete(coroutine2)).resolves
      .toBe('Coroutine 2 is done!')

    return result + result
  })

  coroutine2 = await coroutines.create(async function () {
    const outputA = await coroutines.resume(coroutine4, 13)
    expect(outputA).toBe(26)

    const outputB = await coroutines.resume(coroutine4, 5)
    expect(outputB).toBe(18)

    await utils.randomDelay()
    await expect(coroutines.complete(coroutine4)).resolves.toBe(18)

    return 'Coroutine 2 is done!'
  })

  coroutine3 = await coroutines.create(async function () {
    const result = coroutines.complete(coroutine5)

    await utils.randomDelay()
    await expect(result).rejects.toMatchObject({
      message: 'Oh no, I failed again with you! Pardon me...'
    })

    return 'OH NO'
  })

  coroutine4 = await coroutines.create(async function (value) {
    const result = coroutines.resume(coroutine2, 'whatever')
    await expect(result).rejects.toMatchObject({
      message: 'Coroutine is already running!'
    })

    await utils.randomDelay()
    const input = await this.suspend(value * 2)
    return input + value
  })

  coroutine5 = await coroutines.create(async function () {
    throw Error('Oh no, I failed again with you! Pardon me...')
  })

  await expect(coroutines.resume(coroutine5)).rejects.toMatchObject({
    message: 'Oh no, I failed again with you! Pardon me...'
  })

  await expect(coroutines.complete(coroutine5)).rejects.toMatchObject({
    message: 'Oh no, I failed again with you! Pardon me...'
  })

  await expect(coroutines.resume(coroutine3)).resolves.toBe('OH NO')
  await expect(coroutines.complete(coroutine3)).resolves.toBe('OH NO')

  await expect(coroutines.resume(coroutine1)).resolves.toBe('OH NOOH NO')
  await expect(coroutines.complete(coroutine1)).resolves.toBe('OH NOOH NO')
})
