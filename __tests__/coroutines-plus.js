/* eslint-env node, es6, jest */

'use strict'

const { sporadic } = require('../support')

const { coroutines, streams } = sporadic

it('should listen for coroutine supplies & demands', async () => {
  expect.assertions(9)

  const coroutine = await coroutines.create(async (number) => {
    let sum = 0

    for (let index = 1; index <= 5; index += 1) {
      sum += await coroutines.suspend(number * index)
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
