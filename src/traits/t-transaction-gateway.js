var Promise = require('bluebird');
var Transaction = require('../transaction');
var Transactions = require('../transactions');

var TTransactionGateway = {
  getTransactions: function() {
    if (!this._transactions) {
      this._transactions = new Transactions();
    }
    return this._transactions;
  },

  addTransaction: function(transaction) {
    this.getTransactions().add(transaction);
  },

  sendTransaction: function(message) {
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

  executeTransaction: function(message) {
    if (this.getTransactions().has(message['transaction'])) {
      return this.getTransactions().execute(message['transaction'], message)
        .return(message);
    }
    return Promise.resolve(message);
  }
};

module.exports = TTransactionGateway;
