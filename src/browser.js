var Promise = require('bluebird');
var webrtc = require('webrtc-adapter');
var Client = require('./client');
var JanusError = require('./error');
var WebsocketConnection = require('./websocket-connection');
var Connection = require('./connection');
var Session = require('./session');
var Plugin = require('./plugin');
var MediaPlugin = require('./webrtc/media-plugin');

window.Janus = {
  webrtc: webrtc,
  Promise: Promise,
  Client: Client,
  Error: JanusError,
  Connection: Connection,
  Session: Session,
  Plugin: Plugin,
  MediaPlugin: MediaPlugin,
  WebsocketConnection: WebsocketConnection
};
