janus-gateway-js [![Build Status](https://travis-ci.org/cargomedia/janus-gateway-js.svg?branch=master)](https://travis-ci.org/cargomedia/janus-gateway-js) [![codecov.io](https://codecov.io/github/cargomedia/janus-gateway-js/coverage.svg?branch=master)](https://codecov.io/github/cargomedia/janus-gateway-js?branch=master)
================

## About
Modern javascript client for [janus gateway](https://janus.conf.meetecho.com/). Based on websockets. The original client can be found here https://janus.conf.meetecho.com/docs/rest.html.

## Example of usage

```js
var janus = new Janus.Client('address', {
  token: 'token',
  apisecret: 'apisecret'
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
 * [MediaPlugin](#mediaplugin)
 * [AudiobridgePlugin](#audiobridgeplugin)
 * [AudioroomPlugin](#audioroomplugin)
 * [StreamingPlugin](#streamingplugin)
 * [RtpbroadcastPlugin](#rtpbroadcastplugin)
 * [WebsocketConnection](#websocketconnection)
 * [Error](#error)

#### Important! Please read [MediaPlugin's info](#mediaplugin) when using in Node.

### Client
 Class for creating connections. Use it if you want to create multiple connections to the same address with the same options.
 * `new Client(address, [options])`
    Creates a new instance of Client.
    * `address` {string}. Websocket address of Janus server.
    * `options` {Object} options. Optional. See its specs in `new Connection`. The `options` object will be used for every new created connection by this client.
 * `client.createConnection(id)`

    Returns a promise that is resolved with a new instance of Connection which is already opened.
    * `id` {string} id

### Connection
 Represents websocket connection to Janus.
 * `new Connection(id, address, [options])`

    Creates a new instance of Connection. It is very important to attach an error listener to the created instance in Node environment. For more details please look https://nodejs.org/api/events.html#events_error_events.
    * `id` {string}.
    * `address` {string}. Websocket address of Janus server.
    * `options` {Object} options. Optional.
    * `options.token` {string}. Optional. Janus token.
    * `options.apisecret` {string}. Optional. Janus apisecret.
    * `options.keepalive` {boolean|number}. Optional. If `true` then every 30 seconds a keepalive message will be sent to Janus server. If a positive integer number then a keepalive message will be sent every [number] of milliseconds.

 * `Connection.create(id, address, [options])`

    Delegates to the above constructor. Overwrite it to create a custom Connection.

 * `connection.getId()`

    Returns connection's id.

 * `connection.getAddress()`

    Returns connection's address.

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

 *  `connection.removeSession(sessionId)`

    Removes a session from the connection.
    * `sessionId` {string}.

### Session
 Represents Janus session.
 * `new Session(connection, id)`

    Creates a new instance of Session.
    * `connection` {Connection} an instance of opened Connection
    * `id` {string}

 * `Session.create(connection, id)`

    Delegates to the above constructor. Overwrite it to create a custom Session.

 * `session.getId()`

    Returns session's id.

 *  `session.send(message)`

    Adds session's id to message and delegates it to connection's `send` method. Returns a promise from connection's `send`.
    * `message` {Object}

 *  `session.attachPlugin(name)`

    Attaches a plugin. Returns a promise that is resolved with a new instance of Plugin. Session might have a multiple plugins of the same name.
    * `name` {string} name of plugin

 *  `session.destroy()`

    Destroys session. Returns a promise that is resolved when session is destroyed successfully.

 *  `session.hasPlugin(pluginId)`

    Whether the session has a plugin with id.
    * `pluginId` {string}

 *  `session.getPlugin(pluginId)`

    Returns a plugin from the session or `undefined` if no plugin is found.
    * `pluginId` {string}

 *  `session.addPlugin(plugin)`

    Adds a plugin to the session.
    * `plugin` {Plugin}.

 *  `session.removePlugin(pluginId)`

    Removes a plugin from the session.
    * `pluginId` {string}.

 *  `session.sendSync(message)`

    Sends a message. Returns a promise. If session has a transaction with id equal to `message['transaction']` then the promise is resolved after transaction is completed. Otherwise the same as `session.send`.
    * `message` {Object}.

 *  `session.addTransaction(transaction)`

    Adds a transaction to the session.
    * `transaction` {Transaction}.

 *  `session.executeTransaction(message)`

    Executes a transaction with id equal to `message['transaction']`. Returns a promise that is resolved after the transaction is executed.
    * `message` {Object}.

### Plugin
 Represents Janus plugin.
 * `new Plugin(session, name, id)`

    Creates a new instance of Plugin.
    * `session` {Session} an instance of Session
    * `name` {string} name of Plugin
    * `id` {string}

 * `Plugin.create(session, id)`

    Delegates to the above constructor. Overwrite it to create a custom Plugin.

 * `Plugin.register(name, aClass)`

    Registers a Plugin class `aClass` for a name `name` so when `Plugin.create` is called with `name` the instance of `aClass` is created.

 * `plugin.getId()`

    Returns plugin's id.

 *  `plugin.send(message)`

    Adds plugin's id to message and delegates it to session's `send` method. Returns a promise from session's `send`.
    * `message` {Object}

 *  `plugin.detach()`

    Detaches plugin. Returns a promise that is resolved when plugin is detached successfully.

 *  `plugin.sendSync(message)`

    Sends a message. Returns a promise. If plugin has a transaction with id equal to `message['transaction']` then the promise is resolved after transaction is completed. Otherwise the same as `plugin.send`.
    * `message` {Object}.

 *  `plugin.addTransaction(transaction)`

    Adds a transaction to the plugin.
    * `transaction` {Transaction}.

 *  `plugin.executeTransaction(message)`

    Executes a transaction with id equal to `message['transaction']`. Returns a promise that is resolved after the transaction is executed.
    * `message` {Object}.

### MediaPlugin
  Abstraction plugin class that holds generic Media methods and data. Extends `Plugin`.

  **IMPORTANT** MediaPlugin has methods that require a working WebRTC which is not presented in Node environment. So, be careful when using this library in Node or browser that does not provide WebRTC. This warning is true for all plugins that extend from MediaPlugin.

  Additional methods to `Plugin` are:

 * `plugin.createPeerConnection([options])`

    Creates and returns the created RTCPeerConnection. Also stores it on the instance of plugin.
    * `options` RTCConfiguration

 * `plugin.addStream(stream)`

    Adds stream to the created PeerConnection.
    * `stream` MediaStream

 * `plugin.getLocalMedia(constraints)`

    Wraps MediaDevices.getUserMedia with additional constraint for screen-capturing. Returns promise.
    * `constraints` MediaStreamConstraints

 * `plugin.createOffer([options])`

    Returns promise that is resolved with created offer SDP.
    * `options` RTCOfferOptions

 * `plugin.createAnswer(jsep, [options])`

    Returns promise that is resolved with created answer SDP.
    * `jsep` RTCSessionDescription offer SDP
    * `options` RTCAnswerOptions

 * `plugin.setRemoteSDP(jsep)`

    Sets remote SDP on the stored PeerConnection instance. Returns promise.
    * `jsep` RTCSessionDescription

### AudiobridgePlugin
  It corresponds to 'janus.plugin.audiobridge'. Extends `MediaPlugin`. More thorough details to methods params below can be found at @see https://janus.conf.meetecho.com/docs/janus__audiobridge_8c.html#details. Additional methods to `MediaPlugin` are:

 * `plugin.create(roomId, [options])`

    Requests to create an audio room. Returns a promise that is resolved when the room is created.
    * `roomId` int
    * `options` Object. see JSDocu.

 * `plugin.destroy(roomId, [options])`

    Requests to destroy the audio room. Returns a promise that is resolved when the room is destroyed.
    * `roomId` int
    * `options` Object. see JSDocu.

 * `plugin.list()`

    Requests the list of current rooms. Returns a promise that is resolved with the plugin response.

 * `plugin.listParticipants(roomId)`

    Requests the room's list of participants. Returns a promise that is resolved with the plugin response.
    * `roomId` int

 * `plugin.join(roomId, [options])`

    Requests to join the audio room. Returns a promise that is resolved when the room is joined.
    * `roomId` int
    * `options` Object. see JSDocu.

 * `plugin.leave()`

    Requests to leave the current room. Returns a promise that is resolved when the room is left.

 * `plugin.change(roomId, [options])`

    Requests to change the room. Returns a promise that is resolved when the room is changed.
    * `roomId` int
    * `options` Object. see JSDocu.

 * `plugin.configure([options], [jsep])`

    Configures the current room's settings. Returns a promise that is resolved when the room is configured.
    * `options` Object. see JSDocu.
    * `jsep` RTCSessionDescription

 * `plugin.startMediaStreaming([offerOptions], [configureOptions])`

    Takes user's audio input, creates a peer connection with it and sends an offer. Returns a promise that is resolved with `sendSDP` promise.
    * `offerOptions` Object. Options for the offer.
    * `configureOptions` Object. Options to configure room after the offer send.

 * `plugin.sendSDP(jsep, [configureOptions])`

    Sends an offer with jsep and configure options. Returns a promise that is resolved after the offer has been accepted.
    * `jsep` RTCSessionDescription
    * `configureOptions` Object. Options to configure room.

### AudioroomPlugin
  It corresponds to 'janus.plugin.cm.audioroom'. Docu page is https://github.com/cargomedia/janus-gateway-audioroom. It provides the same functionality as `AudiobridgePlugin` with minor differences: https://github.com/cargomedia/janus-gateway-audioroom#overview.

### StreamingPlugin
  It corresponds to 'janus.plugin.streaming'. Extends `MediaPlugin`. More thorough details to methods params below can be found at @see https://janus.conf.meetecho.com/docs/janus__streaming_8c.html#details. Additional methods to `MediaPlugin` are:

 * `plugin.create(mountpointId, [options])`

    Requests to create a mountpoint. Returns a promise that is resolved when the mountpoint is created.
    * `mountpointId` int
    * `options` Object. see JSDocu.

 * `plugin.destroy(mountpointId, [options])`

    Requests to destroy the mountpoint. Returns a promise that is resolved when the mountpoint is destroyed.
    * `mountpointId` int
    * `options` Object. see JSDocu.

 * `plugin.list()`

    Requests the list of current streams. Returns a promise that is resolved with the plugin response.

 * `plugin.watch(mountpointId, [options])`

    Requests to watch the mountpoint. Returns a promise that is resolved when the mountpoint is watched.
    * `mountpointId` int
    * `options` Object. see JSDocu.

 * `plugin.start([jsep])`

    Requests to start the mountpoint. Returns a promise that is resolved with an SDP from janus.
    * `jsep` RTCSessionDescription

 * `plugin.stop()`

    Requests to stop the current mountpoint. Returns a promise that is resolved when the mountpoint is stopped.

 * `plugin.pause()`

    Requests to pause the current mountpoint. Returns a promise that is resolved when the mountpoint is paused.

 * `plugin.switch(mountpointId, [options])`

    Requests to switch the mountpoint. Returns a promise that is resolved when the mountpoint is switched.
    * `mountpointId` int
    * `options` Object. see JSDocu.

 * `plugin.connect(mountpointId, [options])`

    Toggle method. If plugin does not have a current mountpoint then this method calls `watch` otherwise `switch`.
    * `mountpointId` int
    * `options` Object. see JSDocu.

 * `plugin.enable(mountpointId, [options])`

    Requests to enable the mountpoint. Returns a promise that is resolved when the mountpoint is enabled.
    * `mountpointId` int
    * `options` Object. see JSDocu.

 * `plugin.disable(mountpointId, [options])`

    Requests to disable the mountpoint. Returns a promise that is resolved when the mountpoint is disabled.
    * `mountpointId` int
    * `options` Object. see JSDocu.

 * `plugin.recording(mountpointId, [options])`

    Requests to start or stop recording on the mountpoint.
    * `mountpointId` int
    * `options` Object. see JSDocu.

### RtpbroadcastPlugin
  It corresponds to 'janus.plugin.cm.rtpbroadcast'. Extends `MediaPlugin`. Docu page is https://github.com/cargomedia/janus-gateway-rtpbroadcast. Additional methods to `MediaPlugin` are:

 * `plugin.create(id, [options])`

    Requests to create a mountpoint. Returns a promise that is resolved when the mountpoint is created.
    * `id` string
    * `options` Object. see JSDocu.

 * `plugin.destroy(id)`

    Requests to destroy the mountpoint. Returns a promise that is resolved when the mountpoint is destroyed.
    * `id` string

 * `plugin.list([id])`

    Requests the stream definition for `id`. If `id` is omitted then stream definitions of current streams are requested. Returns a promise that is resolved with the result.
    * `id` string

 * `plugin.watch(id)`

    Requests to watch the mountpoint. Returns a promise that is resolved when the mountpoint is watched.
    * `id` string

 * `plugin.watchUDP(id, streams)`

    Forwards packets from the UDP server to the UDP client. Returns a promise that is resolved then action is done.
    * `id` string
    * `streams` Array

 * `plugin.start()`

    Requests to start the mountpoint. Returns a promise that is resolved with an SDP from janus.

 * `plugin.stop()`

    Requests to stop the current mountpoint. Returns a promise that is resolved when the mountpoint is stopped.

 * `plugin.pause()`

    Requests to pause the current mountpoint. Returns a promise that is resolved when the mountpoint is paused.

 * `plugin.switch(id)`

    Requests to switch the mountpoint. Returns a promise that is resolved when the mountpoint is switched.
    * `id` string

 * `plugin.switchSource(index)`

    Requests to schedule switching of the stream with index for current session mountpoint. Returns a promise that is resolved when request is accepted by janus.
    * `index` number

 * `plugin.superuser(enabled)`

    Upgrades current session into super user session or downgrades otherwise.
    * `enabled` boolean


### WebsocketConnection
 Promisified API for WebSocket.
 * `new WebsocketConnection([websocket])`

    Creates a new instance of WebsocketConnection.
    * `websocket` {WebSocket} websocket. Optional. Either W3C or Node WebSocket instance.

 *  `websocketConnection.open(address, [protocol])`

    Creates a new websocket connection to `address` by `protocol`. Returns a promise that is resolved when the websocket connection is opened.
    * `address` {string} address. Websocket server address to connect to.
    * `protocol` {string} protocol. Websocket protocol.

 *  `websocketConnection.close()`

    Returns a promise that is resolved when the websocketConnection is closed.

 *  `websocketConnection.isOpened()`

    Whether the websocketConnection is opened.

 *  `websocketConnection.send(message)`

    Sends a message. Returns a promise that is resolved immediately after the message has been sent.
    * `message` {Object}.

 *  `websocketConnection.onMessage(message)`

    Listener to incoming message. Call it for simulating of an incoming message if needed.
    * `message` {Object}.


### Error
 Custom Janus errors. All Janus entities use them for controlled errors.
#### JanusError
 * `new JanusError(reason, code, janusMessage)`

    Creates a new instance of JanusError.
    * `reason` {string} text of error.
    * `code` {number} code of error.
    * `janusMessage` {Object} message that caused the error.

#### ConnectionError
 * `new ConnectionError(janusMessage)`

    Creates a new instance of ConnectionError. Extends JanusError.
    * `janusMessage` {Object} message that caused the error.

## Test
There are unit and integration tests. Both are included into CI. To run them just use `npm test`. Also you can check integration tests locally. Just load `test/integration/index.html` into the latest version of Chrome.

## Release
 - update package.json with a new version
 - release a new git tag with the updated package.json

After that the npm release should be done automatically. If it didn't happen then release it manually:
```
npm publish https://github.com/cargomedia/janus-gateway-js/archive/<GitTagWithUpdatedPackageJson>.tar.gz
```
