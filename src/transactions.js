var Promise = require('bluebird');
var Transaction = require('./transaction');

/**
 * @constructor
 */
function Transactions() {
  /** @type {Object} */
  this.list = {};
}

/**
 * @param {Transaction} transaction
 */
Transactions.prototype.add = function(transaction) {
  if (this.has(transaction.id)) {
    throw new Error('Transaction with id: `' + transaction.id + '` already exists');
  }
  if (!(transaction instanceof Transaction)) {
    throw new Error('`transaction` must be an instance of Transaction');
  }
  this.list[transaction.id] = transaction;
};

/**
 * @param {string} id
 * @returns {boolean}
 */
Transactions.prototype.has = function(id) {
  return id && !!this._find(id);
};

/**
 * @param {string} id
 * @returns {Transaction|Null}
 */
Transactions.prototype.find = function(id) {
  return this._find(id) || null;
};

/**
 * @param {string} id
 * @param {Object} message
 * @returns {Promise}
 * @fulfilled {*}
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
 * @param {string} id
 */
Transactions.prototype.remove = function(id) {
  if (!this.has(id)) {
    throw new Error('Transaction with id: `' + id + "` doesn't exist");
  }
  delete this.list[id];
};

/**
 * @param {string} id
 * @returns {Transaction}
 * @protected
 */
Transactions.prototype._find = function(id) {
  return this.list[id];
};

module.exports = Transactions;
