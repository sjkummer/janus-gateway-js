var EventEmitter = require('events');
var util = require('util');
var Promise = require('bluebird');
var JanusError = require('./error');
var Transaction = require('./transaction');

/**
 * @param {JanusSession} session
 * @param {String} name
 * @param {String} id
 * @constructor
 */
function JanusPlugin(session, name, id) {
  JanusPlugin.super_.call(this);
  this._session = session;
  this._name = name;
  this._id = id;
}

util.inherits(JanusPlugin, EventEmitter);

JanusPlugin.create = function(session, name, id) {
  return new JanusPlugin(session, name, id);
};

JanusPlugin.prototype.getId = function() {
  return this._id;
};

/**
 * @param {Object} message
 * @return {Promise}
 */
JanusPlugin.prototype.send = function(message) {
  if (!message['handle_id']) {
    message['handle_id'] = this._id;
  }
  return this._session.send(message);
};

JanusPlugin.prototype.addTransaction = function(transaction) {
  this._session.addTransaction(transaction);
};

/**
 * @return {Promise}
 */
JanusPlugin.prototype.detach = function() {
  return new Promise(function(resolve, reject) {
    this.once('detach', resolve);
    this.send({janus: 'detach'}).catch(reject);
  }.bind(this));
};

JanusPlugin.prototype.processOutcomeMessage = function(message) {
  var janusMessage = message['janus'];
  if ('detach' === janusMessage) {
    return this._onDetach(message);
  }
  return Promise.resolve(message);
};

JanusPlugin.prototype.processIncomeMessage = function(message) {
  var plugin = this;
  return Promise.resolve(message)
    .then(function(message) {
      var janusMessage = message['janus'];
      if ('detached' === janusMessage) {
        return plugin._onDetached(message);
      }
      return message;
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
JanusPlugin.prototype._onDetach = function(outcomeMessage) {
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
JanusPlugin.prototype._onDetached = function(incomeMessage) {
  return this._detach().return(incomeMessage);
};

JanusPlugin.prototype._detach = function() {
  this._session = null;
  this.emit('detach');
  return Promise.resolve();
};

JanusPlugin.prototype.toString = function() {
  return 'JanusPlugin' + JSON.stringify({id: this._id, name: this._name});
};

module.exports = JanusPlugin;
