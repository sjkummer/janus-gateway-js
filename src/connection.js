var Promise = require('bluebird');
var TTransactionEmitter = require('./traits/t-transaction-emitter');
var JanusError = require('./error');
var Transaction = require('./transaction');
var Transactions = require('./transactions');
var WebsocketConnection = require('./websocket-connection');
var Session = require('./session');

/**
 * @param {String} id
 * @param {Object} options
 * @param {String} options.address
 * @param {String} [options.token]
 * @param {String} [options.apisecret]
 * @param {Boolean|Number} [options.keepalive]
 *
 * Please listen to `error` events on a newly created instance in Node environment. For more details please look https://nodejs.org/api/events.html#events_error_events.
 * @constructor
 */
function Connection(id, options) {
  var connection = TTransactionEmitter().create(this.constructor.prototype);

  /** @type {String} */
  connection._id = id;

  /** @type {Object} */
  connection._options = options || {};

  /** @type {Transactions} */
  connection._transactions = new Transactions();

  /** @type {Object} */
  connection._sessions = {};

  /** @type {WebsocketConnection} */
  connection._websocketConnection = new WebsocketConnection();
  connection._installWebsocketListeners();

  return connection;
}

Connection.create = function(id, options) {
  return new Connection(id, options);
};

Connection.prototype._installWebsocketListeners = function() {
  this._websocketConnection.on('open', this.emit.bind(this));
  this._websocketConnection.on('error', this.emit.bind(this));
  this._websocketConnection.on('close', this.emit.bind(this));
  this._websocketConnection.on('message', this.processIncomeMessage.bind(this));
};

Connection.prototype.getId = function() {
  return this._id;
};

Connection.prototype.getOptions = function() {
  return this._options;
};

Connection.prototype.open = function() {
  return this._websocketConnection.open(this._options.address, 'janus-protocol');
};

/**
 * @returns {Promise}
 */
Connection.prototype.close = function() {
  return this._websocketConnection.close();
};

Connection.prototype.createSession = function(message) {
  message = message || {janus: 'create'};
  return this.sendTransaction(message);
};

Connection.prototype.hasSession = function(sessionId) {
  return !!this.getSession(sessionId);
};

Connection.prototype.getSession = function(sessionId) {
  return this._sessions[sessionId];
};

Connection.prototype.addSession = function(session) {
  this._sessions[session.getId()] = session;
  session.once('destroy', function() {
    this.removeSession(session.getId());
  }.bind(this));
};

Connection.prototype.removeSession = function(sessionId) {
  delete this._sessions[sessionId];
};

/**
 * @param message
 * @returns {Promise}
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

module.exports = Connection;
