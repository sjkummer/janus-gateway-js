var Promise = require('bluebird');
var Transaction = require('./transaction');
var Transactions = require('./transactions');
var Trait = require('light-traits').Trait;

function TTransactionsGateway() {

  var transactions = new Transactions();

  var trait = {
    getTransactions: function() {
      return transactions
    },
    send: Trait.required,
    processOutcomeMessage: Trait.required,

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

  return Trait(trait);
}

module.exports = TTransactionsGateway;
