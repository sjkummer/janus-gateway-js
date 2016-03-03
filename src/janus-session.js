var EventEmitter = require('events');
var util = require('util');
var Promise = require('bluebird');
var JanusError = require('./error');
var Timer = require('./timer');
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

  if (this._connection.getOptions()['keepalive']) {
    this._startKeepAlive();
  }
}

util.inherits(JanusSession, EventEmitter);

/**
 * @param {JanusConnection} connection
 * @param {String} id
 * @returns {JanusSession}
 */
JanusSession.create = function(connection, id) {
  return new JanusSession(connection, id);
};

/**
 * @returns {String}
 */
JanusSession.prototype.getId = function() {
  return this._id;
};

/**
 * @param {Object} message
 * @return {Promise}
 */
JanusSession.prototype.send = function(message) {
  if (!this._connection) {
    return Promise.reject(new Error('Can not send message over destroyed ' + this));
  }
  //we always use own session's id in its messages
  message['session_id'] = this._id;
  if (this._keepAliveTimer) {
    this._keepAliveTimer.reset();
  }
  return this._connection.sendTransaction(message);
};

/**
 * @param {String} name
 * @return {Promise}
 */
JanusSession.prototype.attachPlugin = function(name) {
  return this.send({janus: 'attach', plugin: name});
};

/**
 * @returns {Promise}
 */
JanusSession.prototype.destroy = function() {
  return this.send({janus: 'destroy'});
};

/**
 * @param {String} id
 * @returns {boolean}
 */
JanusSession.prototype.hasPlugin = function(id) {
  return !!this.getPlugin(id);
};

/**
 * @param {String} id
 * @returns {JanusPlugin}
 */
JanusSession.prototype.getPlugin = function(id) {
  return this._plugins[id];
};

/**
 * @param {JanusPlugin} plugin
 */
JanusSession.prototype.addPlugin = function(plugin) {
  this._plugins[plugin.getId()] = plugin;
  plugin.once('detach', function() {
    this.removePlugin(plugin.getId())
  }.bind(this));
};

/**
 * @param {String} pluginId
 */
JanusSession.prototype.removePlugin = function(pluginId) {
  delete this._plugins[pluginId];
};

/**
 * @param {Transaction} transaction
 */
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
      return Promise.reject(new Error('Invalid plugin [' + pluginId + ']'));
    }
  }
  return Promise.resolve(message);
};

JanusSession.prototype.processIncomeMessage = function(message) {
  var janusMessage = message['janus'];
  if ('timeout' === janusMessage) {
    return this._onTimeout(message);
  }
  var pluginId = message['handle_id'] || message['sender'];
  if (pluginId) {
    if (this.hasPlugin(pluginId)) {
      return this.getPlugin(pluginId).processIncomeMessage(message);
    } else {
      return Promise.reject(new Error('Invalid plugin [' + pluginId + ']'));
    }
  }
  return Promise.resolve(message);
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
  if (this._keepAliveTimer) {
    this._keepAliveTimer.stop();
    this._keepAliveTimer = null;
  }
  this._plugins = {};
  this._connection = null;
  this.emit('destroy');
  return Promise.resolve();
};

JanusSession.prototype._isNaturalNumber = function(value) {
  if (isNaN(value)) {
    return false;
  }
  var x = parseFloat(value);
  return (x | 0) === x && x > 0;
};

JanusSession.prototype._startKeepAlive = function() {
  var keepAlive = this._connection.getOptions()['keepalive'];
  if (this._isNaturalNumber(keepAlive) && keepAlive < 59000) {
    this._keepAlivePeriod = keepAlive;
  } else {
    this._keepAlivePeriod = 30000;
  }
  this._keepAliveTimer = new Timer(function() {
    this.send({janus: 'keepalive'});
  }.bind(this), this._keepAlivePeriod);
  this._keepAliveTimer.start();
};

JanusSession.prototype.toString = function() {
  return 'JanusSession' + JSON.stringify({id: this._id});
};


module.exports = JanusSession;
