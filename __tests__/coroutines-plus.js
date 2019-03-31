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
