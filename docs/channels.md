# sporadic.channels

Synchronous channels on top of Promises.

This submodule provides an implementation of synchronous message channels /
concurrent queues among many partners. Consumers of this channel race in a
non-deterministic way to receive messages (every sent message maps to a single
consumer), so it allows the implementation of job workers in a master-slave
style. Back-pressure is not needed 'cause the producers synchronize with
consumers to ensure that the message is _delivered_ and _received_.

The back-end for this channel implementation is in-memory (so any failures
implying in reboot and shutdown erase all the sent messages), but future plans
include persistent queues using databases, message queues and sort of that.

## API usage

To import the submodule:

```javascript
const sporadicChannels = require('sporadic').channels
```

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

---

Reading a sent message:

```javascript
const message = await sporadicChannels.receive(channel)
```

This operation resolves to the sent message (the oldest one available), and,
otherwise, if the queue is empty **and** the channel is closed, falls with an
`Error` object message saying that the channel was closed.

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
const { open, send, receive, close, closed } = require('sporadic').channels
```
