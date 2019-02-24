/* eslint-env node, es6, jest */

'use strict'

const preload = function () {
  let sporadic = null
  const LIB_DIR = process.env.LIB_DIR || 'src/sporadic'

  if (process.env.BROWSER_ENV) {
    const fs = require('fs')
    const script = fs.readFileSync(`./${LIB_DIR}`)
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title></title>
          <script>${script}</script>
        </head>
        <body>
        </body>
      </html>
    `, {
      runScripts: 'dangerously',
      resources: 'usable'
    })
    return dom.window.sporadic
  } else {
    sporadic = require(`../${LIB_DIR}`)
  }

  return sporadic
}

module.exports.sporadic = preload()
module.exports.utils = require('./utils')
