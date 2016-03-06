var util = require('util');
var Promise = require('bluebird');
var JanusError = require('./error');
var Transaction = require('./transaction');
var Transactions = require('./transactions');
var WebsocketConnection = require('./websocket-connection');
var Session = require('./session');

/**
 * @param id
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
  var connection = Connection.super_.call(this, id);

  connection._options = options || {};

  /** @type {Transactions} */
  connection._transactions = new Transactions();

  connection._sessions = {};

  return connection;
}

util.inherits(Connection, WebsocketConnection);

Connection.create = function(id, options) {
  return new Connection(id, options);
};

Connection.prototype.getOptions = function() {
  return this._options;
};

Connection.prototype.open = function() {
  return Connection.super_.prototype.open.call(this, this._options.address, 'janus-protocol');
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

Connection.prototype.addTransaction = function(transaction) {
  this._transactions.add(transaction);
};

Connection.prototype.sendTransaction = function(message) {
  if (!message['transaction']) {
    message['transaction'] = Transaction.generateRandomId();
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

Connection.prototype.onMessage = function(message) {
  this.processIncomeMessage(message);
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
      var transactionId = message['transaction'];
      if (connection._transactions.find(transactionId)) {
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

/**
 * @param {Object} message
 * @returns {Promise}
 */
Connection.prototype._send = function(message) {
  if (this._options['token']) {
    message.token = this._options['token'];
  }
  if (this._options['apisecret']) {
    message.apisecret = this._options['apisecret'];
  }
  return Connection.super_.prototype._send.call(this, message);
};

module.exports = Connection;
