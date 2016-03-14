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
 * @param {Object} options
 * @param {string} options.address
 * @param {string} [options.token]
 * @param {string} [options.apisecret]
 * @param {boolean|number} [options.keepalive]
 *
 * Important! Please listen to `error` events on a newly created instance in Node environment. For more details please look https://nodejs.org/api/events.html#events_error_events.
 * @constructor
 * @extends TEventEmitter
 * @extends TTransactionGateway
 */
function Connection(id, options) {
  Connection.validateOptions(options);

  /** @type {string} */
  this._id = id;

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
 * @return {Connection}
 */
Connection.create = function(id, options) {
  return new Connection(id, options);
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
 * @return {string}
 */
Connection.prototype.getId = function() {
  return this._id;
};

/**
 * @return {Object}
 */
Connection.prototype.getOptions = function() {
  return this._options;
};

/**
 * @return {Promise}
 */
Connection.prototype.open = function() {
  return this._websocketConnection.open(this._options.address, 'janus-protocol');
};

/**
 * @return {Promise}
 */
Connection.prototype.close = function() {
  if (this._websocketConnection.isOpened()) {
    this._websocketConnection.close();
  }
  else {
    this.emit('close');
  }
};

/**
 * @return {Promise}
 */
Connection.prototype.createSession = function() {
  return this.sendSync({janus: 'create'});
};

/**
 * @param {string} sessionId
 * @return {boolean}
 */
Connection.prototype.hasSession = function(sessionId) {
  return !!this.getSession(sessionId);
};

/**
 * @param {string} sessionId
 * @return {Session}
 */
Connection.prototype.getSession = function(sessionId) {
  return this._sessions[sessionId];
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
 * @return {Promise}
 */
Connection.prototype.send = function(message) {
  if (this._options['token']) {
    message.token = this._options['token'];
  }
  if (this._options['apisecret']) {
    message.apisecret = this._options['apisecret'];
  }
  return this._websocketConnection.send(message);
};

/**
 * @param {Object} message
 * @return {Promise}
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
 * @return {Promise}
 */
Connection.prototype.processIncomeMessage = function(message) {
  var connection = this;
  return Promise.resolve(message)
    .then(function(message) {
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
 * @return {Promise}
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
  return 'JanusConnection' + JSON.stringify({id: this._id});
};

Connection.validateOptions = function(options) {
  if (!options) {
    throw new Error('Connection options must be set');
  }
  var address = options.address;
  if (!address || address !== address + '') {
    throw new Error('Connection options.address is required and must be a string');
  }
};

module.exports = Connection;
