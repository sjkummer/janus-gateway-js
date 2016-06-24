var Promise = require('bluebird');
var WebSocket = require('websocket').w3cwebsocket;
var TEventEmitter = require('./traits/t-event-emitter');
var Helpers = require('./helpers');

/**
 * @param {WebSocket} [webSocket]
 * @constructor
 * @extends TEventEmitter
 */
function WebsocketConnection(webSocket) {
  /** @type {WebSocket} */
  this._webSocket = webSocket;

  if (this._webSocket) {
    this._onOpen(this._webSocket);
  }
}

Helpers.extend(WebsocketConnection.prototype, TEventEmitter);

/**
 * @param {string} address
 * @param {string} protocol
 * @return {Promise}
 * @fulfilled {WebsocketConnection} when it is opened
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
    this.close();
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
    this.close();
  }.bind(this));
};

/**
 * @return {boolean}
 */
WebsocketConnection.prototype.isOpened = function() {
  return this._webSocket && this._webSocket.OPEN === this._webSocket.readyState;
};

/**
 * @return {boolean}
 */
WebsocketConnection.prototype.isClosed = function() {
  return this._webSocket && this._webSocket.CLOSED === this._webSocket.readyState;
};

/**
 * @return {Promise}
 * @fulfilled when it is closed
 */
WebsocketConnection.prototype.close = function() {
  var connection = this;
  var webSocket = connection._webSocket;
  return new Promise(function(resolve) {
    if (!webSocket || webSocket.readyState == webSocket.CLOSED) {
      connection.emit('close');
      return resolve();
    }
    if (typeof webSocket.readyState !== 'undefined') {
      webSocket.onclose = function() {
        connection.emit('close');
        resolve();
      };
    }
    else {
      webSocket.once('close', function() {
        connection.emit('close');
        resolve();
      });
    }
    webSocket.close();
  });
};

/**
 * @param {Object} message
 * @return {Promise}
 * @fulfilled when message is sent
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
 * @return {Promise}
 * @fulfilled
 * @protected
 */
WebsocketConnection.prototype._queue = function(message) {
  var self = this;
  return new Promise(function(resolve) {
    self.once('open', function() {
      self._send(message).then(function() {
        resolve();
      });
    });
  });
};

/**
 * @param {Object} message
 * @return {Promise}
 * @fulfilled
 * @protected
 */
WebsocketConnection.prototype._send = function(message) {
  return new Promise(function(resolve) {
    this._webSocket.send(JSON.stringify(message));
    resolve();
  }.bind(this));
};

module.exports = WebsocketConnection;
