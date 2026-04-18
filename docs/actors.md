# sporadic.actors

Actor-style concurrency on top of Promises and channels.

This submodule provides a small Erlang-inspired abstraction built on top of the
existing `sporadic.channels` machinery. Each actor has its own mailbox and
processes incoming messages **sequentially**, one at a time.

That means:

- messages are handled in arrival order
- the actor does not share mutable state with callers unless you explicitly
  close over it
- `tell(...)` is fire-and-forget
- `ask(...)` waits for the handler result

This is still JavaScript concurrency, so it runs on the event loop and does not
add preemptive parallelism by itself.

## API usage

To import the submodule:

```javascript
const sporadicActors = require('sporadic').actors
```

Or, in the browser bundle:

```javascript
const sporadicActors = sporadic.actors
```

---

Create a fresh actor:

```javascript
const actor = await sporadicActors.spawn(async function (message) {
  return message
})
```

The same operation is also exported as `create(...)`.

---

Send a message without waiting for a reply:

```javascript
await sporadicActors.tell(actor, 'hello')
```

The `tell(...)` operation is also exported as `send(...)`.

---

Send a message and wait for the handler result:

```javascript
const reply = await sporadicActors.ask(actor, 'hello')
```

The handler result is whatever the actor function returns.

---

Stop an actor:

```javascript
await sporadicActors.stop(actor)
```

Once stopped, the mailbox is closed and future messages are rejected.

---

Check whether the mailbox is already closed:

```javascript
const isClosed = await sporadicActors.closed(actor)
```

---

Check the actor status:

```javascript
const state = sporadicActors.status(actor)
```

Possible values are:

- `CREATED`
- `RUNNING`
- `DEAD`

---

Wait for the actor to terminate:

```javascript
const result = await sporadicActors.complete(actor)
```

This promise resolves when the actor shuts down cleanly, or rejects if the
actor handler fails.

## Actor context

Inside the actor handler, `this` exposes a few helpers:

```javascript
const actor = await sporadicActors.spawn(async function (message) {
  const state = this.status()
  await this.tell('ping')
  return state + ':' + message
})
```

Available methods are:

- `this.status()`
- `this.stop()`
- `this.tell(message, expiration?)`
- `this.ask(message, expiration?)`
- `this.closed()`
- `this.complete()`

## Example: a counter actor

```javascript
const counter = await sporadicActors.spawn(async function (message) {
  this.total = (this.total || 0) + message
  return this.total
})

await sporadicActors.tell(counter, 2)
const value1 = await sporadicActors.ask(counter, 3) // => 5
const value2 = await sporadicActors.ask(counter, 7) // => 12

await sporadicActors.stop(counter)
```

## Notes

Because this abstraction is built on top of the current `sporadic.channels`
implementation, it is best thought of as a lightweight actor mailbox / server
pattern rather than a full distributed actor system.

Future improvements could add worker-backed actors for real parallelism in the
browser and on Node.js.
