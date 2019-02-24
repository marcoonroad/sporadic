# sporadic.channels

Synchronous channels on top of Promises.

This submodule provides an implementation of synchronous message channels /
concurrent queues among many partners. Consumers of this channel race in a
non-deterministic way to receive messages (every sent message maps to a single
consumer), so it allows the implementation of job workers in a master-slave
style. Back-pressure is not needed 'cause the producers synchronize with
consumers to ensure that the message is _delivered_ and _received_.

The channels here resemble the [Go channels][1], with the major exception that
the channels for this library are _dinamically-typed_, so they accept any sort
of message. The back-end for this channel implementation is in-memory (so any
failures implying in reboot and shutdown erase all the sent messages), but
future plans include persistent queues using databases, message queues and sort of that.

## API usage

To import the submodule:

```javascript
const sporadicChannels = require('sporadic').channels
```

Note that the browser bundle at [UNPKG][2]
doesn't need that, 'cause it already imports `sporadic` on global scope of page.
In that case, you may prefer to use the qualified/full-name `sporadic.channels`.
So, just replace the `sporadicChannels` by `sporadic.channels` in the examples
below.

---

To create a fresh concurrent channel:

```javascript
const channel = await sporadicChannels.open()
```

---

Sending a message into the channel:

```javascript
const wasReceived = await sporadicChannels.send(channel, 'Hi, folks!')
```

The variable `wasReceived` is `true` whenever the other side of the channel
(the consumer) read the message with success. Fails if the channel is not open
(that is, `close(channel)` was called before).

Sent messages can expire if they're not received in time. For that case, the
following API was designed for that:

```javascript
const wasReceived = await sporadicChannels.send(
  channel, 'Hi, folks!', expiration
)
```

Where `expiration` is a number in milliseconds (complies with `setTimeout` and
`setInterval` timer functions), and if the message expires, `wasReceived` will
immediately be `false`. The `expiration` argument, thus, is optional (the default
behavior is to disable expiration for the given message). Expiration values
lower than `1` are ignored. Fractional numbers are rounded down by `Math.floor`.

It's possible to schedule a message to be sent on the future. So, if the
`expiration` argument is passed, the total amount of time for the "was received"
promise to be resolved will be such "delay-to-send" + `expiration` (ignoring the
non-deterministic aspect of `close(channel)`, clearly). The API to schedule the
`send(...)` operation is:

```javascript
const wasReceived = await sporadicChannels.sendAfter(
  delay, channel, 'Hi, folks!', expiration
)
```

Where `delay` is also a unit of milliseconds. The `sendAfter(...)` behavior is
the same of `send(...)` (with the major exception of time scheduling), and the
`expiration` argument is optional too. In other words, the following equation
holds (somehow, ignoring details of JavaScript internals regarding the event
loop):

```
send(channel, msg, expiration?) == send(0, channel, msg, expiration?)
```

Negative `delay`s are ignored, and float `delay`s are truncated by `Math.floor`.

---

Reading a sent message:

```javascript
const message = await sporadicChannels.receive(channel)
```

This operation resolves to the sent message (the oldest one available), and,
otherwise, if the queue is empty **and** the channel is closed, falls with an
`Error` object message saying that the channel was closed.

'Cause this operation blocks indefinitely, and sometimes it's not desirable,
an optional argument for a timeout feature is also provided. The API for that is:

```javascript
const message = await sporadicChannels.receive(channel, timeout)
```

Where `timeout` is also an unit of milliseconds (for instance, `2000` means 2
seconds). Whenever the timeout is triggered, an `Error` is thrown in this
promise (but an error different than the case of closed channels). The default
case, when `timeout` is not passed as argument, is to disable the timeout for
the current `receive` call.

To disable blocking, you can just pass a `timeout` of `0` (it will just check
if there's any available message on channel). Negative values are ignored.
Rational/float numbers are rounded by `Math.floor`.

A counterpart of `sendAfter` exists too for the `receive` operation. It's called
`receiveAfter`, and the API resembles quite well the `sendAfter` (with `delay` being
in milliseconds too):

```javascript
const message = await sporadicChannels.receiveAfter(
  delay, channel, timeout
)
```

For the same cases of `sendAfter`, the `delay` here is rounded down by
`Math.floor` and negative values are ignored. The `timeout` is optional as well.
The total amount for the result promise to be resolved is `delay` + `timeout`
(if provided), otherwise, it blocks indefinitely. This equation also holds
(roughly speaking):

```
receive(channel, timeout?) == receiveAfter(0, channel, timeout?)
```

---

To close a channel:

```javascript
const wasOpen = await sporadicChannels.close(channel)
```

This operation resolves to `true` on the first call, and `false` on further
calls. The functional variable `wasOpen` is a boolean value, so.

---

To know when the channel will be closed, use:

```javascript
const isClosed = await sporadicChannels.closed(channel)
```

This operation resolves to `true` whenever a previous `close(channel)` call was
made, otherwise, the result promise of this operation will be still pending.

---

If you don't like to type too much, you can import all the available operations
with this submodule:

```javascript
const {
  open, send, receive, close, closed,
  sendAfter, receiveAfter
} = require('sporadic').channels
```

  [1]: https://gobyexample.com/channels
  [2]: https://unpkg.com/sporadic/dist/index.js
