var Promise = require('bluebird');
var WebSocket = require('websocket').w3cwebsocket;
var EventEmitter = require('./event-emitter');
var Helpers = require('./helpers');

/**
 * @param {WebSocket} [webSocket]
 * @constructor
 * @extends EventEmitter
 */
function WebsocketConnection(webSocket) {
  WebsocketConnection.super_.call(this);
  /** @type {WebSocket} */
  this._webSocket = webSocket;

  if (this._webSocket) {
    this._onOpen(this._webSocket);
  }
}

Helpers.inherits(WebsocketConnection, EventEmitter);

/**
 * @param {string} address
 * @param {string} protocol
 * @returns {Promise}
 * @fulfilled {WebsocketConnection} websocketConnection - when it is opened
 */
WebsocketConnection.prototype.open = function(address, protocol) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var webSocket = new WebSocket(address, protocol || '');
    webSocket.onerror = reject;
    webSocket.onclose = reject;
    webSocket.onopen = function() {
      webSocket.onerror = null;
      webSocket.onclose = null;
      self._onOpen(webSocket);
      resolve(self);
    };
  });
};

/**
 * @param {Object|WebSocket} webSocket
 * @protected
 */
WebsocketConnection.prototype._onOpen = function(webSocket) {
  this._webSocket = webSocket;
  if (typeof webSocket.readyState !== 'undefined') {
    this._installW3cListeners();
  }
  else if (webSocket.on) {
    this._installNodeListeners();
  }
  else {
    throw new Error('Trying to instantiate WebsocketConnection with unknown Websocket');
  }
  this.emit('open');
};

/**
 * @protected
 */
WebsocketConnection.prototype._installW3cListeners = function() {
  this._webSocket.onmessage = function(message) {
    var parsedMessage = JSON.parse(message.data);
    this.onMessage(parsedMessage);
  }.bind(this);

  this._webSocket.onerror = function(error) {
    this.emit('error', error);
  }.bind(this);

  this._webSocket.onclose = function() {
    this._close();
  }.bind(this);
};

/**
 * @protected
 */
WebsocketConnection.prototype._installNodeListeners = function() {
  this._webSocket.on('message', function(message) {
    var parsedMessage = JSON.parse(message);
    this.onMessage(parsedMessage);
  }.bind(this));

  this._webSocket.on('error', function(error) {
    this.emit('error', error);
  }.bind(this));

  this._webSocket.on('close', function() {
    this._close();
  }.bind(this));
};

/**
 * @returns {boolean}
 */
WebsocketConnection.prototype.isOpened = function() {
  return this._webSocket && this._webSocket.OPEN === this._webSocket.readyState;
};

/**
 * @returns {boolean}
 */
WebsocketConnection.prototype.isClosed = function() {
  return !this._webSocket || this._webSocket.CLOSED === this._webSocket.readyState || this._webSocket.CLOSING === this._webSocket.readyState;
};

/**
 * @returns {Promise}
 */
WebsocketConnection.prototype.close = function() {
  if (this.isClosed()) {
    return Promise.resolve();
  }
  return new Promise(function(resolve) {
    this._close();
    resolve();
  }.bind(this));
};

WebsocketConnection.prototype._close = function() {
  if (!this.isClosed()) {
    if (this._webSocket.terminate) {
      this._webSocket.terminate();
    } else {
      this._webSocket.close();
    }
  }
  this.emit('close');
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
WebsocketConnection.prototype.send = function(message) {
  if (this.isOpened()) {
    return this._send(message);
  }
  else if (!this._webSocket || this._webSocket.CONNECTING === this._webSocket.readyState) {
    return this._queue(message);
  }
  else {
    return Promise.reject(new Error('Can not send message over closed connection'));
  }
};

/**
 * @param {Object} message
 */
WebsocketConnection.prototype.onMessage = function(message) {
  try {
    this.emit('message', message);
  } catch (error) {
    this.emit('error', error);
  }
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @protected
 */
WebsocketConnection.prototype._queue = function(message) {
  return new Promise(function(resolve) {
    this.once('open', function() {
      this._send(message).then(function() {
        resolve();
      });
    }.bind(this));
  }.bind(this));
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @protected
 */
WebsocketConnection.prototype._send = function(message) {
  return new Promise(function(resolve) {
    this._webSocket.send(JSON.stringify(message));
    resolve();
  }.bind(this));
};

module.exports = WebsocketConnection;
