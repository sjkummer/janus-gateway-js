var EventEmitter = require('events');
var util = require('util');
var Promise = require('bluebird');
var JanusError = require('./error');
var Transaction = require('./transaction');
var JanusPlugin = require('./janus-plugin');

/**
 * @param {JanusConnection} connection
 * @param {String} id
 * @constructor
 */
function JanusSession(connection, id) {
  JanusSession.super_.call(this);
  this._connection = connection;
  this._id = id;
  this._plugins = {};
}

util.inherits(JanusSession, EventEmitter);

JanusSession.create = function(connection, id) {
  return new JanusSession(connection, id);
};

JanusSession.prototype.getId = function() {
  return this._id;
};

/**
 * @param {Object} message
 * @return {Promise}
 */
JanusSession.prototype.send = function(message) {
  if (!message['session_id']) {
    message['session_id'] = this._id;
  }
  if (this._connection) {
    return this._connection.sendTransaction(message);
  } else {
    throw new Error('Can not send message over destroyed ' + this);
  }
};

/**
 * @param {String} name
 * @return {Promise}
 */
JanusSession.prototype.attachPlugin = function(name) {
  return this.send({janus: 'attach', plugin: name});
};

JanusSession.prototype.destroy = function() {
  return this.send({janus: 'destroy'});
};

JanusSession.prototype.hasPlugin = function(id) {
  return !!this.getPlugin(id);
};

JanusSession.prototype.getPlugin = function(id) {
  return this._plugins[id];
};

JanusSession.prototype.addPlugin = function(plugin) {
  this._plugins[plugin.getId()] = plugin;
  plugin.once('detach', function() {
    this.removePlugin(plugin.getId())
  }.bind(this));
};

JanusSession.prototype.removePlugin = function(pluginId) {
  delete this._plugins[pluginId];
};

JanusSession.prototype.addTransaction = function(transaction) {
  this._connection.addTransaction(transaction);
};

JanusSession.prototype.processOutcomeMessage = function(message) {
  var janusMessage = message['janus'];
  if ('attach' === janusMessage) {
    return this._onAttach(message);
  }
  if ('destroy' === janusMessage) {
    return this._onDestroy(message);
  }
  var pluginId = message['handle_id'];
  if (pluginId) {
    if (this.hasPlugin(pluginId)) {
      return this.getPlugin(pluginId).processOutcomeMessage(message);
    } else {
      return Promise.reject(new Error('InvalidPlugin ' + pluginId));
    }
  }
  return Promise.resolve(message);
};

JanusSession.prototype.processIncomeMessage = function(message) {
  var session = this;
  return Promise.resolve(message)
    .then(function(message) {
      var janusMessage = message['janus'];
      if ('timeout' === janusMessage) {
        return session._onTimeout(message);
      }
      var pluginId = message['handle_id'] || message['sender'];
      if (pluginId) {
        if (session.hasPlugin(pluginId)) {
          return session.getPlugin(pluginId).processIncomeMessage(message);
        } else {
          return Promise.reject(new Error('InvalidPlugin ' + pluginId));
        }
      }
      return message;
    })
};

/**
 * @param {Object} outcomeMessage
 * @return {Promise}
 */
JanusSession.prototype._onAttach = function(outcomeMessage) {
  this.addTransaction(
    new Transaction(outcomeMessage['transaction'], function(response) {
      if ('success' == response['janus']) {
        var pluginId = response['data']['id'];
        this.addPlugin(JanusPlugin.create(this, outcomeMessage['plugin'], pluginId));
        return this.getPlugin(pluginId);
      } else {
        throw new JanusError.ConnectionError(response);
      }
    }.bind(this))
  );
  return Promise.resolve(outcomeMessage);
};

/**
 * @param {Object} incomeMessage
 * @return {Promise}
 */
JanusSession.prototype._onTimeout = function(incomeMessage) {
  return this._destroy().return(incomeMessage);
};

/**
 * @param {Object} outcomeMessage
 * @return {Promise}
 */
JanusSession.prototype._onDestroy = function(outcomeMessage) {
  this.addTransaction(
    new Transaction(outcomeMessage['transaction'], function(response) {
      if ('success' == response['janus']) {
        return this._destroy().return(response);
      } else {
        throw new JanusError.ConnectionError(response);
      }
    }.bind(this))
  );
  return Promise.resolve(outcomeMessage);
};

JanusSession.prototype._destroy = function() {
  //todo destroy plugins if needed
  this._plugins = {};
  this._connection = null;
  this.emit('destroy');
  return Promise.resolve();
};

JanusSession.prototype.toString = function() {
  return 'JanusSession' + JSON.stringify({id: this._id});
};


module.exports = JanusSession;
