var Promise = require('bluebird');
var Transaction = require('../transaction');
var Helpers = require('../helpers');

/**
 * @class TCrudPlugin
 * @extends Plugin
 */
var TCrudPlugin = {

  /**
   * @param {Object} options
   * @return {Promise}
   */
  _create: function(options) {
    var transactionId = Transaction.generateRandomId();
    var transaction = new Transaction(transactionId, function(response) {
      var errorMessage = response['plugindata']['data']['error'];
      if (!errorMessage || errorMessage.indexOf('already exists') > 0) {
        return Promise.resolve(response['plugindata']['data']);
      }
      return Promise.reject(new Error(errorMessage));
    });
    var message = {
      janus: 'message',
      transaction: transactionId,
      body: {
        request: 'create'
      }
    };
    Helpers.extend(message.body, options);

    this.addTransaction(transaction);
    return this.sendSync(message);
  },

  /**
   * @param {Object} options
   * @return {Promise}
   */
  _destroy: function(options) {
    var transactionId = Transaction.generateRandomId();
    var transaction = new Transaction(transactionId, function(response) {
      var errorMessage = response['plugindata']['data']['error'];
      if (!errorMessage) {
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(errorMessage));
    });
    var message = {
      janus: 'message',
      transaction: transactionId,
      body: {
        request: 'destroy'
      }
    };
    Helpers.extend(message.body, options);

    this.addTransaction(transaction);
    return this.sendSync(message);
  },

  /**
   * @return {Promise}
   */
  _list: function() {
    var transactionId = Transaction.generateRandomId();
    var transaction = new Transaction(transactionId, function(response) {
      var errorMessage = response['plugindata']['data']['error'];
      if (!errorMessage) {
        return Promise.resolve(response['plugindata']['data']['list']);
      }
      return Promise.reject(new Error(errorMessage));
    });
    var message = {
      janus: 'message',
      transaction: transactionId,
      body: {
        request: 'list'
      }
    };

    this.addTransaction(transaction);
    return this.sendSync(message);
  }
};


module.exports = TCrudPlugin;
