var Promise = require('bluebird');
var Helpers = require('./helpers');
var EventEmitter = require('./event-emitter');
var TTransactionGateway = require('./traits/t-transaction-gateway');
var JanusError = require('./error');
var Transaction = require('./transaction');
var WebsocketConnection = require('./websocket-connection');
var Session = require('./session');
var JanusMessage = require('./janus-message');

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
 * @extends EventEmitter
 * @extends TTransactionGateway
 */
function Connection(id, address, options) {
  Connection.super_.call(this);

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

Helpers.inherits(Connection, EventEmitter);
Helpers.extend(Connection.prototype, TTransactionGateway);

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
  this._websocketConnection.on('open', this.emit.bind(this, 'open'));
  this._websocketConnection.on('error', this.emit.bind(this, 'error'));
  this._websocketConnection.on('close', this.emit.bind(this, 'close'));
  this._websocketConnection.on('message', function(message) {
    this.processIncomeMessage(new JanusMessage(message)).catch(function(error) {
      this.emit('error', error);
    }.bind(this));
  }.bind(this));
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
    var self = this;
    return Promise.map(this.getSessionList(), function(session) {
      return session.cleanup();
    }).then(function() {
      return self._websocketConnection.close();
    }).then(function() {
      self.emit('close');
    });
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
 * @returns {Session[]}
 */
Connection.prototype.getSessionList = function() {
  return Object.keys(this._sessions).map(function(id) {
    return this._sessions[id];
  }.bind(this));
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
  if ('create' === message['janus']) {
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
 * @param {JanusMessage} incomeMessage
 * @returns {Promise}
 * @fulfilled {JanusMessage} incomeMessage
 */
Connection.prototype.processIncomeMessage = function(incomeMessage) {
  this.emit('message', incomeMessage);
  var sessionId = incomeMessage.get('session_id');
  if (sessionId && this.hasSession(sessionId)) {
    return this.getSession(sessionId).processIncomeMessage(incomeMessage);
  }
  var self = this;
  return Promise
    .try(function() {
      if (sessionId && !self.hasSession(sessionId)) {
        throw new Error('Invalid session: [' + sessionId + ']');
      }
      return self.defaultProcessIncomeMessage(incomeMessage);
    });
};

/**
 * @param {Object} outcomeMessage
 * @returns {Promise}
 * @fulfilled {Object} outcomeMessage
 * @protected
 */
Connection.prototype._onCreate = function(outcomeMessage) {
  this.addTransaction(new Transaction(outcomeMessage['transaction'], function(incomeMessage) {
    if ('success' == incomeMessage.get('janus')) {
      var sessionId = incomeMessage.get('data', 'id');
      this.addSession(Session.create(this, sessionId));
      return this.getSession(sessionId);
    } else {
      throw new JanusError(incomeMessage);
    }
  }.bind(this)));
  return Promise.resolve(outcomeMessage);
};

Connection.prototype.toString = function() {
  return 'JanusConnection' + JSON.stringify({id: this._id, address: this._address});
};

module.exports = Connection;
