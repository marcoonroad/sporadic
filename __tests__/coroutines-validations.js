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

it('should fail on any coroutine operation if coroutine is invalid', async () => {
  expect.assertions(3)

  const invalidCoroutine = {}

  try {
    coroutines.status(invalidCoroutine)
  } catch (reason) {
    expect(reason).toMatchObject({
      message: 'Expected a valid coroutine!'
    })
  }

  try {
    coroutines.supplies(invalidCoroutine)
  } catch (reason) {
    expect(reason).toMatchObject({
      message: 'Expected a valid coroutine!'
    })
  }

  try {
    coroutines.demands(invalidCoroutine)
  } catch (reason) {
    expect(reason).toMatchObject({
      message: 'Expected a valid coroutine!'
    })
  }
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

it('should fail on coroutines without supplies/demands streams', async () => {
  expect.assertions(8)

  const coroutine = await coroutines.create(async function () {
    try {
      this.supplies()
    } catch (reason) {
      expect(reason).toMatchObject({
        message: 'Coroutine created without supplies/demands streams!'
      })
    }

    await this.suspend('PAUSE')

    try {
      this.demands()
    } catch (reason) {
      expect(reason).toMatchObject({
        message: 'Coroutine created without supplies/demands streams!'
      })
    }

    return 'OK'
  }, { streamsMode: 'DISABLE' })

  try {
    coroutines.supplies(coroutine)
  } catch (reason) {
    expect(reason).toMatchObject({
      message: 'Coroutine created without supplies/demands streams!'
    })
  }

  try {
    coroutines.demands(coroutine)
  } catch (reason) {
    expect(reason).toMatchObject({
      message: 'Coroutine created without supplies/demands streams!'
    })
  }

  const result1 = await coroutines.resume(coroutine)
  expect(result1).toBe('PAUSE')
  const result2 = await coroutines.resume(coroutine)
  expect(result2).toBe('OK')

  try {
    coroutines.supplies(coroutine)
  } catch (reason) {
    expect(reason).toMatchObject({
      message: 'Coroutine created without supplies/demands streams!'
    })
  }

  try {
    coroutines.demands(coroutine)
  } catch (reason) {
    expect(reason).toMatchObject({
      message: 'Coroutine created without supplies/demands streams!'
    })
  }
})

it('should fail on invalid coroutine configuration', async () => {
  expect.assertions(1)

  const result = coroutines.create(async function () {
    return 'HEY'
  }, { streamsMode: 'INVALID-MODE' })

  await expect(result).rejects.toMatchObject({
    message: 'Invalid coroutine configuration options.streamsMode: INVALID-MODE'
  })
})
