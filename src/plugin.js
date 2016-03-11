var Promise = require('bluebird');
var Helpers = require('./helpers');
var TEventEmitter = require('./traits/t-event-emitter');
var TTransactionGateway = require('./traits/t-transaction-gateway');
var JanusError = require('./error');
var Transaction = require('./transaction');

/**
 * @param {Session} session
 * @param {String} name
 * @param {String} id
 * @constructor
 */
function Plugin(session, name, id) {
  this._session = session;
  this._name = name;
  this._id = id;

  var plugin = this;
  session.on('destroy', function() {
    plugin._detach();
  });
}

Helpers.extend(Plugin.prototype, TEventEmitter, TTransactionGateway);

Plugin.create = function(session, name, id) {
  return new Plugin(session, name, id);
};

Plugin.prototype.getId = function() {
  return this._id;
};

/**
 * @param {Object} message
 * @return {Promise}
 */
Plugin.prototype.send = function(message) {
  message['handle_id'] = this._id;
  return this._session.send(message);
};

/**
 * @return {Promise}
 */
Plugin.prototype.detach = function() {
  return new Promise(function(resolve, reject) {
    this.once('detach', resolve);
    this.send({janus: 'detach'}).catch(reject);
  }.bind(this));
};

Plugin.prototype.processOutcomeMessage = function(message) {
  var janusMessage = message['janus'];
  if ('detach' === janusMessage) {
    return this._onDetach(message);
  }
  return Promise.resolve(message);
};

Plugin.prototype.processIncomeMessage = function(message) {
  var plugin = this;
  return Promise.resolve(message)
    .then(function(message) {
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
 * @return {Promise}
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
 * @return {Promise}
 */
Plugin.prototype._onDetached = function(incomeMessage) {
  return this._detach().return(incomeMessage);
};

Plugin.prototype._detach = function() {
  this._session = null;
  this.emit('detach');
  return Promise.resolve();
};

Plugin.prototype.toString = function() {
  return 'Plugin' + JSON.stringify({id: this._id, name: this._name});
};

module.exports = Plugin;
