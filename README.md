janus-gateway-js [![Build Status](https://travis-ci.org/cargomedia/janus-gateway-js.svg?branch=master)](https://travis-ci.org/cargomedia/janus-gateway-js) [![codecov.io](https://codecov.io/github/cargomedia/janus-gateway-js/coverage.svg?branch=master)](https://codecov.io/github/cargomedia/janus-gateway-js?branch=master)
================

## About
Modern javascript client for [janus gateway](https://janus.conf.meetecho.com/).

## Example of usage

```js
var janus = new Janus.Client({
  token: 'token',
  apisecret: 'apisecret',
  address: 'address'
});

janus.createConnection().then(function(connection) {
  connection.createSession().then(function(session) {
    session.attachPlugin('bla').then(function(plugin) {
      plugin.send({}).then(function(response){});
      plugin.on('message', function(message) {});
      plugin.detach();
    });
  });
});
```

## API

The library is available for Node and Browser environment. In Browser it is declared through `window.Janus`. The exported classes are:
 * [Client](#client)
 * [Connection](#connection)
 * [Session](#session)
 * [Plugin](#plugin)
 * [Error](#error)
 * [WebsocketConnection](#websocket-connection)

### Client
 * `new Client(options)`
    Creates a new instance of Client.
    * `options` {Object} options. See its specs in `new Connection`. The `options` object will be used for every new created connection by this client.
 * `client.createConnection(id)`

    Returns a promise that is resolved with a new instance of Connection which is already opened.
    * `id` {string} id

### Connection
 * `new Connection(id, options)`

    Creates a new instance of Connection. It is very important to attach an error listener to the created instance in Node environment. For more details please look https://nodejs.org/api/events.html#events_error_events.
    * `options` {Object} options.
    * `options.address` {string}. Websocket address of Janus server.
    * `[options.token]` {string}. Optional. Janus token.
    * `[options.apisecret]` {string}. Optional. Janus apisecret.
    * `[options.keepalive]` {boolean|number}. Optional. If `true` then every 30 seconds a keepalive message will be sent to Janus server. If a positive integer number then a keepalive message will be sent every [number] of milliseconds.

 * `Connection.create(id, options)`

    Delegates to the above constructor. Overwrite it to create a custom Connection.

 * `connection.getId()`

    Returns connection's id.

 *  `connection.getOptions()`

    Returns connection's options.

 *  `connection.open()`

    Returns a promise that is resolved when a websocket connection to `options.address` is opened.

 *  `connection.close()`

    Returns a promise that is resolved when the connection is closed.

 *  `connection.send(message)`

    Sends a message. Returns a promise that is resolved immediately after the message has been sent.
    * `message` {Object}.

 *  `connection.sendSync(message)`

    Sends a message. Returns a promise. If connection has a transaction with id equal to `message['transaction']` then the promise is resolved after transaction is completed. Otherwise the same as `connection.send`.
    * `message` {Object}.

 *  `connection.addTransaction(transaction)`

    Adds a transaction to the connection.
    * `transaction` {Transaction}.

 *  `connection.executeTransaction(message)`

    Executes a transaction with id equal to `message['transaction']`. Returns a promise that is resolved after the transaction is executed.
    * `message` {Object}.

 *  `connection.createSession()`

    Returns a promise that is resolved with a new instance of Session.

 *  `connection.hasSession(sessionId)`

    Whether the connection has a session with `sessionId`.
    * `sessionId` {string}

 *  `connection.getSession(sessionId)`

    Returns a session from the connection or `undefined` if no session is found.
    * `sessionId` {string}.

 *  `connection.addSession(session)`

    Adds a session to the connection.
    * `session` {Session}.
