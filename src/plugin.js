var Promise = require('bluebird');
var Helpers = require('./helpers');
var EventEmitter = require('./event-emitter');
var JanusError = require('./error');
var TTransactionGateway = require('./traits/t-transaction-gateway');
var Transaction = require('./transaction');
var JanusPluginMessage = require('./janus-plugin-message');

/**
 * @param {Session} session
 * @param {string} name
 * @param {string} id
 *
 * @constructor
 * @extends EventEmitter
 * @extends TTransactionGateway
 */
function Plugin(session, name, id) {
  Plugin.super_.call(this);
  this._session = session;
  this._name = name;
  this._id = id;

  var plugin = this;
  session.on('destroy', function() {
    plugin._detach();
  });
}

Helpers.inherits(Plugin, EventEmitter);
Helpers.extend(Plugin.prototype, TTransactionGateway);

Plugin._types = {};

/**
 * @see {@link Plugin}
 * @returns {Plugin}
 */
Plugin.create = function(session, name, id) {
  var aClass = this._types[name];
  if (aClass) {
    return new aClass(session, name, id);
  }
  return new Plugin(session, name, id);
};

/**
 * @param {string} name
 * @param {function(new:Plugin)} aClass
 */
Plugin.register = function(name, aClass) {
  this._types[name] = aClass;
};

/**
 * @returns {string}
 */
Plugin.prototype.getId = function() {
  return this._id;
};

/**
 * @returns {string}
 */
Plugin.prototype.getName = function() {
  return this._name;
};

/**
 * @returns {string}
 */
Plugin.prototype.getResponseAlias = function() {
  throw new Error('Plugin.getResponseAlias must be implemented');
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
Plugin.prototype.send = function(message) {
  message['handle_id'] = this._id;
  if (this._session) {
    return this._session.send(message);
  } else {
    return Promise.reject(new Error('No active session'));
  }
};

/**
 * @returns {Promise}
 */
Plugin.prototype.detach = function() {
  if (this._session) {
    return new Promise(function(resolve, reject) {
      this.once('detach', resolve);
      this.sendWithTransaction({janus: 'detach'}).catch(reject);
    }.bind(this));
  }
  return Promise.resolve();
};

/**
 * @returns {Promise}
 */
Plugin.prototype.cleanup = function() {
  return this._detach();
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @fulfilled {Object} message
 */
Plugin.prototype.processOutcomeMessage = function(message) {
  return Promise.resolve(message);
};

/**
 * @param {JanusMessage} incomeMessage
 * @returns {Promise}
 */
Plugin.prototype.processIncomeMessage = function(incomeMessage) {
  var self = this;
  return Promise
    .try(function() {
      incomeMessage = new JanusPluginMessage(incomeMessage.getPlainMessage(), self);
      if ('detached' === incomeMessage.get('janus')) {
        return self._onDetached();
      }
      return self.defaultProcessIncomeMessage(incomeMessage);
    })
    .then(function() {
      self.emit('message', incomeMessage);
    })
    .catch(function(error) {
      self.emit('error', error);
    })
};

/**
 * @returns {Promise}
 * @protected
 */
Plugin.prototype._onDetached = function() {
  return this._detach();
};

/**
 * @returns {Promise}
 * @protected
 */
Plugin.prototype._detach = function() {
  if (this._session) {
    this._session = null;
    this.emit('detach');
  }
  return Promise.resolve();
};

Plugin.prototype.toString = function() {
  return 'Plugin' + JSON.stringify({id: this._id, name: this._name});
};

/**
 * @param {Object} options
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage}
 */
Plugin.prototype.sendWithTransaction = function(options) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(incomeMessage) {
    var errorMessage = incomeMessage.getError();
    if (!errorMessage) {
      return Promise.resolve(incomeMessage);
    }
    var error = new JanusError(incomeMessage);
    return Promise.reject(error);
  });
  var message = {
    janus: 'message',
    transaction: transactionId
  };
  Helpers.extend(message, options);

  this.addTransaction(transaction);
  var sendPromise = this.sendSync(message);

  return new Promise(function(resolve, reject) {

    transaction.promise.catch(function(e) {
      reject(e);
    });
    sendPromise.then(function(r) {
      resolve(r);
    }).catch(function(e) {
      reject(e);
    })
  });
};

module.exports = Plugin;
