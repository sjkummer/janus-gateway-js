var util = require('util');
var Promise = require('bluebird');
var JanusError = require('./error');
var Transaction = require('./transaction');
var Transactions = require('./transactions');
var WebsocketConnection = require('./websocket-connection');
var JanusSession = require('./janus-session');

/**
 * @param id
 * @param {Object} options
 * @param {String} options.address
 * @param {String} [options.token]
 * @param {String} [options.apisecret]
 *
 * Please listen to `error` events on a newly created instance in Node environment. For more details please look https://nodejs.org/api/events.html#events_error_events.
 * @constructor
 */
function JanusConnection(id, options) {
  JanusConnection.super_.call(this, id);

  this._options = options || {};

  /** @type {Transactions} */
  this._transactions = new Transactions();

  this._sessions = {};
}

util.inherits(JanusConnection, WebsocketConnection);

JanusConnection.create = function(id, options) {
  return new JanusConnection(id, options);
};

JanusConnection.prototype.getOptions = function() {
  return this._options;
};

JanusConnection.prototype.open = function() {
  return JanusConnection.super_.prototype.open.call(this, this._options.address, 'janus-protocol');
};

JanusConnection.prototype.createSession = function(message) {
  message = message || {janus: 'create'};
  return this.sendTransaction(message);
};

JanusConnection.prototype.hasSession = function(sessionId) {
  return !!this.getSession(sessionId);
};

JanusConnection.prototype.getSession = function(sessionId) {
  return this._sessions[sessionId];
};

JanusConnection.prototype.addSession = function(session) {
  this._sessions[session.getId()] = session;
  session.once('destroy', function() {
    this.removeSession(session.getId());
  }.bind(this));
};

JanusConnection.prototype.removeSession = function(sessionId) {
  delete this._sessions[sessionId];
};

JanusConnection.prototype.addTransaction = function(transaction) {
  this._transactions.add(transaction);
};

JanusConnection.prototype.sendTransaction = function(message) {
  if (!message['transaction']) {
    message['transaction'] = this.generateTransactionId();
  }
  var self = this;
  return this.processOutcomeMessage(message)
    .then(function(message) {
      return self.send(message);
    })
    .then(function() {
      var transaction = self._transactions.find(message['transaction']);
      if (transaction) {
        return transaction.promise;
      }
      return Promise.resolve();
    });
};

JanusConnection.prototype.onMessage = function(message) {
  this.processIncomeMessage(message);
};

JanusConnection.prototype.processOutcomeMessage = function(message) {
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

JanusConnection.prototype.processIncomeMessage = function(message) {
  var connection = this;
  return Promise.resolve(message)
    .then(function(message) {
      var transactionId = message['transaction'];
      if (transactionId && connection._transactions.find(transactionId)) {
        return connection._transactions.execute(transactionId, message)
          .return(message);
      }
      var sessionId = message['session_id'];
      if (sessionId) {
        if (connection.hasSession(sessionId)) {
          return connection.getSession(sessionId).processIncomeMessage(message);
        } else {
          return Promise.reject(new Error('Invalid session: [' + sessionId + ']'));
        }
      }
      return message;
    })
    .then(function(message) {
      connection.emit('message', message);
      return message;
    })
    .catch(function(error) {
      connection.emit('error', error);
    });
};

JanusConnection.prototype._onCreate = function(outcomeMessage) {
  this.addTransaction(new Transaction(outcomeMessage['transaction'], function(response) {
    if ('success' == response['janus']) {
      var sessionId = response['data']['id'];
      this.addSession(JanusSession.create(this, sessionId));
      return this.getSession(sessionId);
    } else {
      throw new JanusError.ConnectionError(response);
    }
  }.bind(this)));
  return Promise.resolve(outcomeMessage);
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
JanusConnection.prototype._send = function(message) {
  if (this._options['token']) {
    message.token = this._options['token'];
  }
  if (this._options['apisecret']) {
    message.apisecret = this._options['apisecret'];
  }
  return JanusConnection.super_.prototype._send.call(this, message);
};

JanusConnection.prototype.generateTransactionId = function() {
  return JanusConnection.generateTransactionId();
};

/**
 * @returns {String}
 */
JanusConnection.generateTransactionId = function() {
  return Math.random().toString(36).substring(2, 12);
};

module.exports = JanusConnection;
