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

module.exports.ignorePromises = ignorePromises
module.exports.extractValue = extractValue
module.exports.extractNext = extractNext
module.exports.seconds = seconds
