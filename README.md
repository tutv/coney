# coney

A simple queue backed by RabbitMQ.

## Installation

`coney` requires [`amqplib`](https://www.npmjs.com/package/amqplib) as a peer dependency. Install both:

```
yarn add coney amqplib

# or npm i coney amqplib
```

### Peer dependency

| Package   | Required version |
|-----------|------------------|
| `amqplib` | `^1.0.0`         |

## Features

- Support simple queue with retry and delay
- Support pub/sub

## License

This code is free to use under the terms of the MIT license.

