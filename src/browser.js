var Promise = require('bluebird');
var Client = require('./client');
var JanusError = require('./error');
var WebsocketConnection = require('./websocket-connection');
var Transaction = require('./transaction');
var Connection = require('./connection');
var Session = require('./session');
var Plugin = require('./plugin');
var MediaPlugin = require('./webrtc/media-plugin');

window.Janus = {
  Promise: Promise,
  Client: Client,
  Error: JanusError,
  Connection: Connection,
  Session: Session,
  Plugin: Plugin,
  MediaPlugin: MediaPlugin,
  WebsocketConnection: WebsocketConnection,
  Transaction: Transaction
};
