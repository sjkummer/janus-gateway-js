var Promise = require('bluebird');
var webrtc = require('webrtc-adapter');
var Client = require('./client');
var JanusError = require('./error');
var WebsocketConnection = require('./websocket-connection');
var Connection = require('./connection');
var Session = require('./session');
var Plugin = require('./plugin');
var MediaPlugin = require('./webrtc/media-plugin');
var AudiobridgePlugin = require('./webrtc/plugin/audiobridge-plugin');
var StreamingPlugin = require('./webrtc/plugin/streaming-plugin');

window.Janus = {
  webrtc: webrtc,
  Promise: Promise,
  Error: JanusError,
  WebsocketConnection: WebsocketConnection,
  Client: Client,
  Connection: Connection,
  Session: Session,
  Plugin: Plugin,
  MediaPlugin: MediaPlugin,
  AudiobridgePlugin: AudiobridgePlugin,
  StreamingPlugin: StreamingPlugin
};
