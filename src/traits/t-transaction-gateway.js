var Promise = require('bluebird');
var JanusError = require('../error');
var Transaction = require('../transaction');
var Transactions = require('../transactions');

/**
 * @class TTransactionGateway
 */
var TTransactionGateway = {
  /**
   * @returns {Transactions}
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
   * @returns {Promise}
   * @fulfilled {*}
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
   * @param {JanusMessage} incomeMessage
   * @returns {boolean}
   */
  hasTransaction: function(incomeMessage) {
    return this.getTransactions().has(incomeMessage.get('transaction'));
  },

  /**
   * @param {JanusMessage} incomeMessage
   * @returns {Promise}
   * @fulfilled {*}
   */
  executeTransaction: function(incomeMessage) {
    return this.getTransactions().execute(incomeMessage.get('transaction'), incomeMessage);
  },

  /**
   * @param {JanusMessage} incomeMessage
   * @returns {Promise}
   * @fulfilled {*}
   */
  defaultProcessIncomeMessage: function(incomeMessage) {
    var self = this;
    if (self.hasTransaction(incomeMessage)) {
      return self.executeTransaction(incomeMessage);
    } else {
      if (incomeMessage.getError()) {
        return Promise.reject(new JanusError(incomeMessage));
      }
    }
  }
};

module.exports = TTransactionGateway;
