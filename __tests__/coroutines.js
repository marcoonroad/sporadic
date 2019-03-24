/* eslint-env node, es6, jest */

'use strict'

const sporadic = require('../support').sporadic

const {
  create, status, resume, complete
} = sporadic.coroutines

it('should be able to create a coroutine', async () => {
  expect.assertions(1)

  const coroutine = await create(async function () {
    return true
  })

  expect(status(coroutine)).toBe('CREATED')
})

it('should be able to resume & suspend a coroutine', async () => {
  expect.assertions(10)

  let coroutine = null
  coroutine = await create(async function (number) {
    expect(number).toBe(12)

    expect(this.status(coroutine)).toBe('RUNNING')

    await expect(resume(coroutine, 'NO NO')).rejects.toMatchObject({
      message: 'Coroutine is already running!'
    })

    await expect(this.suspend(number + 3)).resolves.toBe('Hello, World!')

    return 'OK OK'
  })

  await expect(resume(coroutine, 12)).resolves.toBe(15)
  expect(status(coroutine)).toBe('SUSPENDED')

  await expect(resume(coroutine, 'Hello, World!')).resolves.toBe('OK OK')
  expect(status(coroutine)).toBe('DEAD')

  await expect(resume(coroutine, 'NO NO AGAIN')).rejects.toMatchObject({
    message: 'Coroutine is dead!'
  })

  await expect(complete(coroutine)).resolves.toBe('OK OK')
})

it('should break a coroutine if it fails', async () => {
  expect.assertions(4)

  const coroutine = await create(async function (input) {
    expect(input).toBe(undefined)

    throw Error('I am sorry, forgive me!')
  })

  await expect(resume(coroutine)).rejects.toMatchObject({
    message: 'I am sorry, forgive me!'
  })

  await expect(resume(coroutine)).rejects.toMatchObject({
    message: 'Coroutine is dead!'
  })

  await expect(complete(coroutine)).rejects.toMatchObject({
    message: 'I am sorry, forgive me!'
  })
})
