var Promise = require('bluebird');
var EventEmitter = require('events');
var WebSocket = require('websocket').w3cwebsocket;
var util = require('util');


/**
 * @param {String} id
 * @param {WebSocket} [webSocket]
 * @constructor
 */
function WebsocketConnection(id, webSocket) {
  /** @type {String} */
  this._id = id;

  /** @type {WebSocket} */
  this._webSocket = webSocket;

  if (this._webSocket) {
    this._onOpen(this._webSocket);
  }
}

util.inherits(WebsocketConnection, EventEmitter);

WebsocketConnection.prototype.getId = function() {
  return this._id;
};

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

WebsocketConnection.prototype._onOpen = function(webSocket) {
  this._webSocket = webSocket;
  if (webSocket.onmessage !== undefined && webSocket.onerror !== undefined && webSocket.onclose !== undefined) {
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

WebsocketConnection.prototype._installW3cListeners = function() {
  this._webSocket.onmessage = function(message) {
    var parsedMessage = JSON.parse(message.data);
    this.onMessage(parsedMessage);
  }.bind(this);

  this._webSocket.onerror = function(error) {
    this.emit('error', error);
  }.bind(this);

  this._webSocket.onclose = function() {
    this.emit('close');
  }.bind(this);
};

WebsocketConnection.prototype._installNodeListeners = function() {
  this._webSocket.on('message', function(message) {
    var parsedMessage = JSON.parse(message);
    this.onMessage(parsedMessage);
  }.bind(this));

  this._webSocket.on('error', function(error) {
    this.emit('error', error);
  }.bind(this));

  this._webSocket.on('close', function() {
    this.emit('close');
  }.bind(this));
};

/**
 * @returns {Boolean}
 */
WebsocketConnection.prototype.isOpened = function() {
  return this._webSocket && this._webSocket.OPEN === this._webSocket.readyState;
};

WebsocketConnection.prototype.close = function() {
  this._webSocket.close();
  //TODO check for readyState === CLOSED. We can overwrite here this._webSocket.onclose cause we don't need it anymore in _onOpen.
  return Promise.resolve();
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
WebsocketConnection.prototype.send = function(message) {
  if (this.isOpened()) {
    return this._send(message);
  } else {
    return this._queue(message);
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
 * @private
 */
WebsocketConnection.prototype._queue = function(message) {
  var self = this;
  return new Promise(function(resolve) {
    self.once('open', function() {
      self._send(message).then(function(response) {
        resolve(response);
      });
    });
  });
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @private
 */
WebsocketConnection.prototype._send = function(message) {
  return new Promise(function(resolve) {
    this._webSocket.send(JSON.stringify(message));
    resolve();
  }.bind(this));
};

WebsocketConnection.prototype.toString = function() {
  return 'Connection' + JSON.stringify({id: this._id});
};

module.exports = WebsocketConnection;
