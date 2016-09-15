var Promise = require('bluebird');
var Helpers = require('./helpers');
var EventEmitter = require('./event-emitter');
var TTransactionGateway = require('./traits/t-transaction-gateway');
var JanusError = require('./error');
var Timer = require('./timer');
var Transaction = require('./transaction');
var Plugin = require('./plugin');

/**
 * @param {Connection} connection
 * @param {string} id
 *
 * @constructor
 * @extends EventEmitter
 * @extends TTransactionGateway
 */
function Session(connection, id) {
  Session.super_.call(this);
  this._connection = connection;
  this._id = id;
  this._plugins = {};

  if (this._connection.getOptions()['keepalive']) {
    this._startKeepAlive();
  }
  var session = this;
  connection.on('close', function() {
    session._destroy();
  });
}

Helpers.inherits(Session, EventEmitter);
Helpers.extend(Session.prototype, TTransactionGateway);

/**
 * @see {@link Session}
 * @returns {Session}
 */
Session.create = function(connection, id) {
  return new Session(connection, id);
};

/**
 * @returns {string}
 */
Session.prototype.getId = function() {
  return this._id;
};

/**
 * @param {Object} message
 * @returns {Promise}
 */
Session.prototype.send = function(message) {
  if (!this._connection) {
    return Promise.reject(new Error('Can not send message over destroyed ' + this));
  }
  //we always use own session's id in its messages
  message['session_id'] = this._id;
  if (this._keepAliveTimer) {
    this._keepAliveTimer.reset();
  }
  return this._connection.send(message);
};

/**
 * @param {string} name
 * @returns {Promise}
 * @fulfilled {Plugin} plugin
 */
Session.prototype.attachPlugin = function(name) {
  return this.sendSync({janus: 'attach', plugin: name});
};

/**
 * @returns {Promise}
 * @fulfilled {Object} response
 */
Session.prototype.destroy = function() {
  return this.sendSync({janus: 'destroy'});
};

/**
 * @param {string} pluginId
 * @returns {boolean}
 */
Session.prototype.hasPlugin = function(pluginId) {
  return !!this.getPlugin(pluginId);
};

/**
 * @param {string} pluginId
 * @returns {Plugin}
 */
Session.prototype.getPlugin = function(pluginId) {
  return this._plugins[pluginId];
};

/**
 * @returns {Plugin[]}
 */
Session.prototype.getPluginList = function() {
  return Object.keys(this._plugins).map(function(id) {
    return this._plugins[id];
  }.bind(this));
};

/**
 * @param {Plugin} plugin
 */
Session.prototype.addPlugin = function(plugin) {
  this._plugins[plugin.getId()] = plugin;
  plugin.once('detach', function() {
    this.removePlugin(plugin.getId())
  }.bind(this));
};

/**
 * @param {string} pluginId
 */
Session.prototype.removePlugin = function(pluginId) {
  delete this._plugins[pluginId];
};

/**
 * @param {Object} message
 * @returns {Promise}
 * @fulfilled {Object} message
 */
Session.prototype.processOutcomeMessage = function(message) {
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

/**
 * @param {Object} message
 * @returns {Promise}
 * @fulfilled {Object} message
 */
Session.prototype.processIncomeMessage = function(message) {
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
  return this.executeTransaction(message);
};

/**
 * @param {Object} outcomeMessage
 * @returns {Promise}
 * @fulfilled {Object} outcomeMessage
 * @protected
 */
Session.prototype._onAttach = function(outcomeMessage) {
  this.addTransaction(
    new Transaction(outcomeMessage['transaction'], function(response) {
      if ('success' == response['janus']) {
        var pluginId = response['data']['id'];
        this.addPlugin(Plugin.create(this, outcomeMessage['plugin'], pluginId));
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
 * @returns {Promise}
 * @fulfilled {Object} incomeMessage
 */
Session.prototype._onTimeout = function(incomeMessage) {
  return this._destroy().return(incomeMessage);
};

/**
 * @param {Object} outcomeMessage
 * @returns {Promise}
 * @fulfilled {Object} outcomeMessage
 * @protected
 */
Session.prototype._onDestroy = function(outcomeMessage) {
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

/**
 * @returns {Promise}
 * @protected
 */
Session.prototype._destroy = function() {
  this._stopKeepAlive();
  this._plugins = {};
  this._connection = null;
  this.emit('destroy');
  return Promise.resolve();
};

/**
 * @param {*} value
 * @returns {boolean}
 * @protected
 */
Session.prototype._isNaturalNumber = function(value) {
  if (isNaN(value)) {
    return false;
  }
  var x = parseFloat(value);
  return (x | 0) === x && x > 0;
};

/**
 * @protected
 */
Session.prototype._startKeepAlive = function() {
  var keepAlive = this._connection.getOptions()['keepalive'];
  if (this._isNaturalNumber(keepAlive) && keepAlive < 59000) {
    this._keepAlivePeriod = keepAlive;
  } else {
    this._keepAlivePeriod = 30000;
  }
  var session = this;
  this._keepAliveTimer = new Timer(function() {
    session.send({janus: 'keepalive'})
      .catch(function(error) {
        if (session._connection.isClosed()) {
          session._stopKeepAlive();
        }
        throw error;
      });
  }, this._keepAlivePeriod);
  this._keepAliveTimer.start();
};

Session.prototype._stopKeepAlive = function() {
  if (this._keepAliveTimer) {
    this._keepAliveTimer.stop();
    this._keepAliveTimer = null;
  }
};

Session.prototype.toString = function() {
  return 'Session' + JSON.stringify({id: this._id});
};


module.exports = Session;
