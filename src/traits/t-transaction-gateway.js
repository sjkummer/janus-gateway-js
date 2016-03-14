var Promise = require('bluebird');
var Transaction = require('../transaction');
var Transactions = require('../transactions');

/**
 * @class TTransactionGateway
 */
var TTransactionGateway = {
  /**
   * @return {Transactions}
   */
  getTransactions: function() {
    if (!this._transactions) {
      this._transactions = new Transactions();
    }
    return this._transactions;
  },

  /**
   * @param {Transaction} transaction
   */
  addTransaction: function(transaction) {
    this.getTransactions().add(transaction);
  },

  /**
   * @param {Object} message
   * @return {Promise}
   */
  sendSync: function(message) {
    if (!message['transaction']) {
      message['transaction'] = Transaction.generateRandomId();
    }
    var self = this;
    return this.processOutcomeMessage(message)
      .then(function(message) {
        return self.send(message);
      })
      .then(function(result) {
        var transaction = self.getTransactions().find(message['transaction']);
        if (transaction) {
          return transaction.promise;
        }
        return result;
      });
  },

  /**
   * @param {Object} message
   * @return {Promise}
   */
  executeTransaction: function(message) {
    if (this.getTransactions().has(message['transaction'])) {
      return this.getTransactions().execute(message['transaction'], message)
        .return(message);
    }
    return Promise.resolve(message);
  }
};

module.exports = TTransactionGateway;
