# sporadic.streams

Reactive streams on top of Promises.

This submodule provides an implementation glitch-free (i.e, no lost events) and
leak-free (i.e, garbage collection is possible) for reactive programming. The
minimal abstraction is called _stream_, used to associate many producers to many
consumers.

Although not real-time (a.k.a, the synchronous / instantaneous axiom /
assumption found on Synchronous Imperative languages, such as [Lucid][1]), this
`sporadic.streams` submodule offers asynchronous reactivity without glitches.
Future plans include composable stream operations interacting with Channels,
Promises, etc, in the same sense of [Perl 6's _Supply_ class][2].

The API revolves around an `async` / `await` style, and thus, a promise / future
concurrency model. Consumers read deterministically published values (the same
stream point yields the same event), while producers may non-deterministically
race / dispute the order of events arrival. Streams are closed for further writes
and reads by _breaking_ / _rejecting_ the stream in a promise-style through the
close operation.

Garbage collection comes for free by implementing a linked list of streamed /
promisified `next` nodes. That is, if the current node is not referenced anymore
and the next node is resolved (by sending some value into the current one), so
the current node becomes prone to garbage collection. So, in short terms, pay
attention on your stream point references, and discard them whenever you can and
whenever you don't need them anymore.

## API Usage

To load this submodule:

```javascript
const sporadicStreams = require('sporadic').streams
```

If you're using the browser build from [UNPKG][3], the `sporadic` module will be
available on the global scope of your page. In this context, just replace the
`sporadicStreams` variable by the projection/expression `sporadic.streams` in
all the examples below.

---

Creates a new reactive stream:

```javascript
const stream = await sporadicStreams.open()
```

---

Write on a reactive stream:

```javascript
const next = await sporadicStreams.push(stream, value)
```

Where `next` is the next stream to send values onto. This operation may fail due
a sent close signal. You can reuse many times the `stream` reference instead of
tracking `next`, for example:

```javascript
await sporadicStreams.push(stream, 'Hello, Mike!')
await sporadicStreams.push(stream, 'Are you fine?')
await sporadicStreams.push(stream, 'See you later!')
```

Although it's a discouraged pattern, 'cause it forces you to keep all the stream
point references in-memory, without discarding any of them, a huge risk of
memory leaking for long-running applications. Don't rely on that except for
short running tests. **You have read this warning.** The good solution, so, is
a _threading_ of references (the example below show how it's possible):

```javascript
const stream1 = await sporadicStreams.push(stream0, 'Hello, Mike!')
const stream2 = await sporadicStreams.push(stream1, 'Are you fine?')
const stream3 = await sporadicStreams.push(stream2, 'See you later!')
// ...
```

Through non-determinism on writes, clients can get the next stream point in
unpredictable ways (only if there's more than one writer). The threading above
seems deterministic cause there's no race. It allows garbage collection, only if
further references aren't part of the same scope -- the best solution here, tho,
would be to iterate the generated stream points through a loop, or use them
together with generators+promises (as a task scheduler).

---

To consume / read a value:

```javascript
// may throw reason
const { current, next } = await sporadicStreams.pull(stream)
```

Where `next` is the next stream point to read future pushed values, and
`current` is the current pushed value at this stream point. This operation may
fail due a sent close signal. The same stream point here would yield the same
current value and the same next stream point.

---

To destroy an active stream:

```javascript
// throws reason
await sporadicStreams.close(stream)
```

Previous clients might not be up-to-date (due late computations), so they will
keep reading values until an `Error` is available, then they will break /
fail with that. Further calls on `close` are ignored, so close is
idempotent no matter how many races occur (that is, multiple API clients calling
that operation). The `Error` message will be the same for every thrown error,
but don't rely on that message content, it may be prone to future changes.

---

A ticker is also provided. It fires `true` in some given interval. To create
such stream which ticks periodical signals, use the `every` operation:

```javascript
const tickerStream = await sporadicStreams.every(milliseconds)
```

The interval argument is under milliseconds basis to comply with the well-known
`setTimeout` and `setInterval` JavaScript functions. To stop the ticker stream
from firing further events, just call `close` on such stream (it will also
dispose the internal interval timer associated within).

---

'Cause streams resemble quite well lists, there's also some combinators provided
here. They're `map` and `filter`:

```javascript
const succ = number => number + 1
const even = number => (number % 2) === 0

const producer = await sporadicStreams.open()
const consumer = await sporadicStreams.map(producer, succ)
const filtered = await sporadicStreams.filter(consumer, even)

// fire values/events from producer stream to follow down
// them on filtered stream
// ...
```

Whenever the parent/origin stream is closed, the children/result streams are
closed as well. In the case above, if `producer` is closed, both `consumer` and
`filtered` will be closed too. And if just `consumer` is closed, `filtered` will
be closed but not `producer` -- here, the fired values within `producer` will be
ignored for both closed result streams.

---

To import all operations on the current scope, you can use the following
pattern (from modern JS):

```javascript
const {
  open, push, close, pull,
  every, map, filter
} = require('sporadic').streams
```

  [1]: https://en.wikipedia.org/wiki/Lucid_(programming_language)
  [2]: https://docs.perl6.org/type/Supply
  [3]: https://unpkg.com/sporadic/dist/index.js
