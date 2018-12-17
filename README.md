# sporadic

Composable Concurrency Abstractions.

## Installation

Through NPM (if available):

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

## Documentation

For every submodule within this `sporadic` library, there's an API documentation
available at the directory `docs/` under the filename `SUBMODULE.md`, where
`SUBMODULE` stands for the submodule provided with this library (yes, I know the
redundancy :joy:). Each submodule corresponds to a concurrency abstraction.
Currently, the following abstractions are implemented:

- `sporadic.streams`, an abstraction for reactive streams made of multiple
  publishers and multiple subscribers. The subscription process is implicit,
  the reference for the stream object is all that is needed.


## Remarks

PRs & Issues are always welcome :house:! Feel free to open one :v:!
Happy hacking :computer:!
