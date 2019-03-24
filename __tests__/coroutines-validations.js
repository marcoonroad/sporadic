/* eslint-env node, es6, jest */

'use strict'

const { sporadic } = require('../support')

const { coroutines } = sporadic

it('should fail resume if coroutine is invalid', async () => {
  expect.assertions(1)

  const invalidCoroutine = {}
  const supply = coroutines.resume(invalidCoroutine, 12)

  await expect(supply).rejects.toMatchObject({
    message: 'Expected a valid coroutine!'
  })
})

it('should fail suspend if coroutine is not active', async () => {
  expect.assertions(1)

  let suspend = null
  const coroutine = await coroutines.create(async function () {
    suspend = this.suspend

    await this.suspend(true)

    return false
  })

  await coroutines.resume(coroutine)

  await expect(suspend(12)).rejects.toMatchObject({
    message: 'Expected an active coroutine to yield from!'
  })
})
