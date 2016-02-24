var Promise = require('bluebird');
var Janus = require('./janus');
var JanusError = require('./error');
var WebsocketConnection = require('./websocket-connection');
var JanusConnection = require('./janus-connection');
var JanusSession = require('./janus-session');
var JanusPlugin = require('./janus-plugin');

var toExport = {
  Janus: Janus,
  JanusError: JanusError,
  JanusConnection: JanusConnection,
  JanusSession: JanusSession,
  JanusPlugin: JanusPlugin,
  WebsocketConnection: WebsocketConnection
};

if (window) {
  window.Janus = toExport;
  window.Promise = Promise;
}
exports = toExport;
