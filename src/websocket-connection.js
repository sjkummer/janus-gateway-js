var util = require('util');
var Promise = require('bluebird');
var WebSocket = require('websocket').w3cwebsocket;
var TEventEmitter = require('./t-event-emitter');


/**
 * @param {String} id
 * @param {WebSocket} [webSocket]
 * @constructor
 */
function WebsocketConnection(id, webSocket) {
  var connection = TEventEmitter().create(this.constructor.prototype);

  /** @type {String} */
  connection._id = id;

  /** @type {WebSocket} */
  connection._webSocket = webSocket;

  if (connection._webSocket) {
    connection._onOpen(connection._webSocket);
  }

  return connection;
}

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
  if (webSocket instanceof WebSocket) {
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
    this.close();
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
    this.close();
  }.bind(this));
};

/**
 * @returns {Boolean}
 */
WebsocketConnection.prototype.isOpened = function() {
  return this._webSocket && this._webSocket.OPEN === this._webSocket.readyState;
};

WebsocketConnection.prototype.close = function() {
  var connection = this;
  var webSocket = connection._webSocket;
  return new Promise(function(resolve) {
    if (webSocket.readyState == webSocket.CLOSED) {
      connection.emit('close');
      return resolve();
    }
    if (webSocket instanceof WebSocket) {
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
