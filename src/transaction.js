var Promise = require('bluebird');
var error = require('./error');

/**
 * @callback Transaction~callback
 * @return {Promise}
 */

/**
 * @param {string} id
 * @param {Transaction~callback} callback
 * @param {number} [timeout] in milliseconds. Timeout until transaction is executed. Default 30seconds.
 * @constructor
 */
function Transaction(id, callback, timeout) {
  this.id = id;
  timeout = timeout || 30000;
  var self = this;
  this.promise = new Promise(function(resolve, reject) {
    self._callback = function() {
      var result;
      try {
        result = callback.apply(null, arguments);
      } catch (error) {
        result = Promise.reject(error);
      }
      if (!(result instanceof Promise)) {
        result = Promise.resolve(result);
      }
      result.then(resolve, reject);
      return result;
    };

    self._timeout = setTimeout(function() {
      reject(new error.Error('Transaction timeout', 490));
    }, timeout);
  });
}

/**
 * @param {...*}
 * @return {Promise}
 */
Transaction.prototype.execute = function() {
  if (this.promise.isRejected()) {
    return this.promise;
  }
  clearTimeout(this._timeout);
  this._timeout = null;
  return this._callback.apply(this, arguments);
};

/**
 * @return {string}
 */
Transaction.generateRandomId = function() {
  return Math.random().toString(36).substring(2, 12);
};

module.exports = Transaction;
