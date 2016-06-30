var Promise = require('bluebird');
var Helpers = require('./helpers');
var TEventEmitter = require('./traits/t-event-emitter');
var TTransactionGateway = require('./traits/t-transaction-gateway');
var JanusError = require('./error');
var Transaction = require('./transaction');
var WebsocketConnection = require('./websocket-connection');
var Session = require('./session');

/**
 * @param {string} id
 * @param {string} address
 * @param {Object} [options]
 * @param {string} [options.token]
 * @param {string} [options.apisecret]
 * @param {boolean|number} [options.keepalive]
 * @param {Object} [options.pc] RTCPeerConnection constructor options
 * @param {Object} [options.pc.config]
 * @param {Object} [options.pc.constraints]
 *
 * Important! Please listen to `error` events on a newly created instance in Node environment. For more details please look https://nodejs.org/api/events.html#events_error_events.
 * @constructor
 * @extends TEventEmitter
 * @extends TTransactionGateway
 */
function Connection(id, address, options) {
  /** @type {string} */
  this._id = id;

  /** @type {string} */
  this._address = address;

  /** @type {Object} */
  this._options = options || {};

  /** @type {Object} */
  this._sessions = {};

  /** @type {WebsocketConnection} */
  this._websocketConnection = new WebsocketConnection();
  this._installWebsocketListeners();
}

Helpers.extend(Connection.prototype, TEventEmitter, TTransactionGateway);

/**
 * @see {@link Connection}
 * @returns {Connection}
 */
Connection.create = function(id, address, options) {
  return new Connection(id, address, options);
};

/**
 * @protected
 */
Connection.prototype._installWebsocketListeners = function() {
  this._websocketConnection.on('open', this.emit.bind(this));
  this._websocketConnection.on('error', this.emit.bind(this));
  this._websocketConnection.on('close', this.emit.bind(this));
  this._websocketConnection.on('message', this.processIncomeMessage.bind(this));
};

/**
 * @returns {string}
 */
Connection.prototype.getId = function() {
  return this._id;
};

/**
 * @returns {string}
 */
Connection.prototype.getAddress = function() {
  return this._address;
};

/**
 * @returns {Object}
 */
Connection.prototype.getOptions = function() {
  return this._options;
};

/**
 * @returns {Promise}
 * @fulfilled {Connection} connection - when it is opened
 */
Connection.prototype.open = function() {
  return this._websocketConnection.open(this._address, 'janus-protocol').return(this);
};

/**
 * @returns {Promise}
 */
Connection.prototype.close = function() {
  if (this._websocketConnection.isOpened()) {
    return this._websocketConnection.close().then(function() {
      this.emit('close');
    }.bind(this));
  }
  return Promise.resolve();
};

/**
 * @returns {Promise}
 * @fulfilled {Session} session
 */
Connection.prototype.createSession = function() {
  return this.sendSync({janus: 'create'});
};

/**
 * @param {string} sessionId
 * @returns {boolean}
 */
Connection.prototype.hasSession = function(sessionId) {
  return !!this.getSession(sessionId);
};

/**
 * @param {string} sessionId
 * @returns {Session}
 */
Connection.prototype.getSession = function(sessionId) {
  return this._sessions[sessionId];
};

/**
 * @returns {boolean}
 */
Connection.prototype.isClosed = function() {
  return this._websocketConnection.isClosed();
};

/**
 * @param {Session} session
 */
Connection.prototype.addSession = function(session) {
  this._sessions[session.getId()] = session;
  session.once('destroy', function() {
    this.removeSession(session.getId());
  }.bind(this));
};

/**
 * @param {string} sessionId
 */
Connection.prototype.removeSession = function(sessionId) {
  delete this._sessions[sessionId];
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
Connection.prototype.send = function(message) {
  if (this._options['token']) {
    message.token = this._options['token'];
  }
  if (this._options['apisecret']) {
    message.apisecret = this._options['apisecret'];
  }
  if (!message['transaction']) {
    message['transaction'] = Transaction.generateRandomId();
  }
  return this._websocketConnection.send(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @fulfilled {Object} message
 */
Connection.prototype.processOutcomeMessage = function(message) {
  var janusMessage = message['janus'];
  if ('create' === janusMessage) {
    return this._onCreate(message);
  }
  var sessionId = message['session_id'];
  if (sessionId) {
    if (this.hasSession(sessionId)) {
      return this.getSession(sessionId).processOutcomeMessage(message);
    } else {
      return Promise.reject(new Error('Invalid session: [' + sessionId + ']'));
    }
  }
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @fulfilled {Object} message
 */
Connection.prototype.processIncomeMessage = function(message) {
  var connection = this;
  return Promise
    .try(function() {
      var sessionId = message['session_id'];
      if (sessionId) {
        if (connection.hasSession(sessionId)) {
          return connection.getSession(sessionId).processIncomeMessage(message);
        } else {
          return Promise.reject(new Error('Invalid session: [' + sessionId + ']'));
        }
      }
      return connection.executeTransaction(message);
    })
    .then(function(message) {
      connection.emit('message', message);
      return message;
    })
    .catch(function(error) {
      connection.emit('error', error);
    });
};

/**
 * @param {Object} outcomeMessage
 * @returns {Promise}
 * @fulfilled {Object} outcomeMessage
 * @protected
 */
Connection.prototype._onCreate = function(outcomeMessage) {
  this.addTransaction(new Transaction(outcomeMessage['transaction'], function(response) {
    if ('success' == response['janus']) {
      var sessionId = response['data']['id'];
      this.addSession(Session.create(this, sessionId));
      return this.getSession(sessionId);
    } else {
      throw new JanusError.ConnectionError(response);
    }
  }.bind(this)));
  return Promise.resolve(outcomeMessage);
};

Connection.prototype.toString = function() {
  return 'JanusConnection' + JSON.stringify({id: this._id, address: this._address});
};

module.exports = Connection;
