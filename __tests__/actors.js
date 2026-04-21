/* eslint-env node, es6, jest */

// @ts-check

'use strict'

const support = require('../support')
const sporadic = support.sporadic

it('should create actors', async () => {
  const actor = sporadic.actors.create({
    counter: 1,

    /**
     * @function
     * @param {string} property
     * @param  {...any} values
     * @returns
     */
    fallback: async function (property, ...values) {
      const thisObject = this
      const result = await sporadic.tasks.spawn(() => {
        if (property === 'decrease') {
          thisObject.counter -= values[0]
          return true
        } else {
          throw Error(`Method [${property}] not found`)
        }
      })
      return result
    },

    /**
     * @function
     * @param {number} amount
     * @returns
     */
    increase: async function (amount) {
      const thisObject = this
      const result = await sporadic.tasks.spawn(() => {
        thisObject.counter += amount
        return true
      })
      return result
    }
  })

  expect(actor.counter).toBe(1)

  const promise1 = actor.increase(2)
  const promise2 = actor.increase(3)

  // @ts-ignore
  const promise3 = actor.multiply(2)

  // @ts-ignore
  const promise4 = actor.decrease(4)

  const check1 = expect(promise1).resolves.toBe(true)
  const check2 = expect(promise2).resolves.toBe(true)
  const check3 = expect(promise3).rejects.toMatchObject(Error('Method [multiply] not found'))
  const check4 = expect(promise4).resolves.toBe(true)

  await Promise.all([ check1, check2, check3, check4 ])

  expect(actor.counter).toBe(2)

  /**
   * @function
   * @this {*}
   * @param {number} amount
   * @returns
   */
  // @ts-ignore
  actor.multiply = async function (amount) {
    const thisObject = this
    const result = await sporadic.tasks.spawn(async () => {
      thisObject.counter *= amount
      return true
    })
    return result
  }

  // @ts-ignore
  const promise5 = actor.multiply(5)
  const check5 = expect(promise5).resolves.toBe(true)
  await check5
  expect(actor.counter).toBe(10)

  actor.kill()

  expect(() => actor.counter).toThrow(TypeError('Cannot perform \'get\' on a proxy that has been revoked'))
})
