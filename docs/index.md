# sporadic

Composable Concurrency Abstractions for JavaScript.

<a href="https://travis-ci.com/marcoonroad/sporadic"><img src="https://img.shields.io/travis/com/marcoonroad/sporadic.svg?style=flat-square&logo=travis"/></a>
<a href="https://gitlab.com/marcoonroad/sporadic/pipelines"><img src="https://img.shields.io/gitlab/pipeline/marcoonroad/sporadic.svg?style=flat-square&logo=gitlab"/></a>
<a href="https://coveralls.io/github/marcoonroad/sporadic?branch=master">
<img src="https://img.shields.io/coveralls/github/marcoonroad/sporadic.svg?style=flat-square"/></a>
<a href="https://www.npmjs.com/package/sporadic"><img src="https://img.shields.io/npm/dw/sporadic.svg?style=flat-square&logo=npm"/></a>
<a href="https://github.com/marcoonroad/sporadic/blob/master/LICENSE"><img src="https://img.shields.io/github/license/marcoonroad/sporadic.svg?style=flat-square&logo=github"/></a>

---

## Example

```javascript
#!/usr/bin/env node

(async () => {
  const sporadic = require('sporadic')
  const channel = await sporadic.channels.open()

  const wasReceivedPromise = sporadic.channels.send(channel, "Hello, World!")
  const messagePromise = sporadic.channels.receive(channel)
  const promises = [ wasReceivedPromise, messagePromise ]

  const [ wasReceived, message ] = await Promise.all(promises)
  console.log(wasReceived) // ==> true
  console.log(message) // ==> Hello, World!
})()
```

---

## Installation

Through UNPKG (for browsers):

```html
<script src="https://unpkg.com/sporadic/dist/index.js"></script>
```

Through NPM:

```shell
$ npm install sporadic
```

---

To install the development snapshot, use `npm link`.
For example, on this cloned repository:

```shell
$ npm link .
```

And then, on your project:

```shell
$ npm link sporadic
```

Stable releases are tags in the branch `release`. The `master` branch here is
only to track the next releases, please don't rely too much on that branch. All
the hard work is made on the `development` branch.

## Documentation

For every submodule within this `sporadic` library, there's an API documentation
available at the directory `docs/` under the filename `SUBMODULE.md`, where
`SUBMODULE` stands for the submodule provided with this library (yes, I know the
redundancy :joy:). Each submodule corresponds to a concurrency abstraction.
Currently, the following abstractions are implemented:

- [sporadic.streams][1], an abstraction for reactive streams made of multiple
  publishers and multiple subscribers. The subscription process is implicit,
  the reference for the stream object is all that is needed.
- [sporadic.channels][2], an abstraction for synchronous queues made of many
  producers and consumers. This concurrent data type is a bare minimal tool for
  pipelines of chained producers and consumers.

  [1]: https://marcoonroad.github.io/sporadic/streams
  [2]: https://marcoonroad.github.io/sporadic/channels

## Remarks

PRs & Issues are always welcome :house:! Feel free to open one :v:!
Happy hacking :computer:!
