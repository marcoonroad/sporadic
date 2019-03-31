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

const seconds = () =>
  Math.floor((new Date()).getTime() / 1000)

const random = (since, until) =>
  Math.ceil((Math.random() * (until - since)) + since)

const randomDelay = () =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true)
    }, random(50, 100))
  })

module.exports.ignorePromises = ignorePromises
module.exports.extractValue = extractValue
module.exports.extractNext = extractNext
module.exports.seconds = seconds
module.exports.random = random
module.exports.randomDelay = randomDelay
