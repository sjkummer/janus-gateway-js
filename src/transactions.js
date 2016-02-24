var Promise = require('bluebird');
var Transaction = require('./transaction');

function Transactions() {
  /** @type {Object} */
  this.list = {};
}

/**
 * @param {Transaction} transaction
 */
Transactions.prototype.add = function(transaction) {
  if (this.has(transaction.id)) {
    throw new Error('Transaction with id: `' + id + '` already stored');
  }
  if (!(transaction instanceof Transaction)) {
    throw new Error('`transaction` must be `Transaction`');
  }
  this.list[transaction.id] = transaction;
};

/**
 * @param {String} id
 * @returns {Boolean}
 */
Transactions.prototype.has = function(id) {
  return !!this._find(id);
};

/**
 * @param {String} id
 * @returns {Transaction|Null}
 */
Transactions.prototype.find = function(id) {
  return this._find(id) || null;
};

/**
 * @param {String} id
 * @param {Object} message
 */
Transactions.prototype.execute = function(id, message) {
  var transaction = this.find(id);
  if (!transaction) {
    throw new Error('Transaction `' + id + '` not found');
  }
  if ('ack' !== message['janus']) {
    this.remove(id);
    return transaction.execute(message);
  }
  return Promise.resolve(message);
};

/**
 * @param {String} id
 */
Transactions.prototype.remove = function(id) {
  if (!this.has(id)) {
    throw new Error('Transaction with id: `' + id + "` doesn't exist");
  }
  delete this.list[id];
};

/**
 * @private
 */
Transactions.prototype._find = function(id) {
  return this.list[id];
};

module.exports = Transactions;
