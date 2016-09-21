var Promise = require('bluebird');
var Helpers = require('./helpers');
var EventEmitter = require('./event-emitter');
var TTransactionGateway = require('./traits/t-transaction-gateway');
var JanusError = require('./error');
var Transaction = require('./transaction');
var PluginResponse = require('./plugin-response');

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
 * @param {Object} message
 * @returns {Promise}
 */
Plugin.prototype.send = function(message) {
  message['handle_id'] = this._id;
  return this._session.send(message);
};

/**
 * @returns {Promise}
 */
Plugin.prototype.detach = function() {
  if (this._session) {
    return new Promise(function(resolve, reject) {
      this.once('detach', resolve);
      this.send({janus: 'detach'}).catch(reject);
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
  var janusMessage = message['janus'];
  if ('detach' === janusMessage) {
    return this._onDetach(message);
  }
  return Promise.resolve(message);
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @fulfilled {Object} message
 */
Plugin.prototype.processIncomeMessage = function(message) {
  var plugin = this;
  return Promise
    .try(function() {
      var janusMessage = message['janus'];
      if ('detached' === janusMessage) {
        return plugin._onDetached(message);
      }
      return plugin.executeTransaction(message);
    })
    .then(function(message) {
      plugin.emit('message', message);
      return message;
    });
};

/**
 * @param {Object} outcomeMessage
 * @returns {Promise}
 * @fulfilled {Object} outcomeMessage
 * @protected
 */
Plugin.prototype._onDetach = function(outcomeMessage) {
  this.addTransaction(
    new Transaction(outcomeMessage['transaction'], function(response) {
      if ('success' !== response['janus']) {
        throw new JanusError.ConnectionError(response);
      }
    })
  );
  return Promise.resolve(outcomeMessage);
};

/**
 * @param {Object} incomeMessage
 * @returns {Promise}
 * @fulfilled {Object} incomeMessage
 * @protected
 */
Plugin.prototype._onDetached = function(incomeMessage) {
  return this._detach().return(incomeMessage);
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
 * @fulfilled {PluginResponse}
 */
Plugin.prototype.sendWithTransaction = function(options) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    response = new PluginResponse(response);
    var errorMessage = response.getError();
    if (!errorMessage) {
      return Promise.resolve(response);
    }
    var error = new Error(errorMessage);
    error.response = response;
    return Promise.reject(error);
  });
  var message = {
    janus: 'message',
    transaction: transactionId
  };
  Helpers.extend(message, options);

  this.addTransaction(transaction);
  return this.sendSync(message);
};

module.exports = Plugin;
