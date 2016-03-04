var EventEmitter = require('events');
var util = require('util');
var Promise = require('bluebird');
var Transactions = require('./transactions');

function TransactionGateway() {
  /** @type {Transactions} */
  this._transactions = new Transactions();
}

util.inherits(TransactionGateway, EventEmitter);

TransactionGateway.prototype._send = function() {
  return Promise.reject(new Error('TransactionGateway._send must be overridden'));
};

TransactionGateway.prototype.send = function(message) {
  return this._send(message)
    .then(function(result) {
      var transaction = this._transactions.find(message['transaction']);
      if (transaction) {
        return transaction.promise;
      }
      return result;
    }.bind(this));
};

TransactionGateway.prototype.processIncomeMessage = function(message) {
  if (this._transactions.has(message['transaction'])) {
    return this._transactions.execute(message['transaction'], message)
      .return(message);
  }
  return Promise.resolve(message);
};

module.exports = TransactionGateway;
