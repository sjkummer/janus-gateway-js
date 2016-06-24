var Promise = require('bluebird');
var error = require('./error');

/**
 * @callback Transaction~callback
 * @return {Promise}
 * @fulfilled {*}
 */

/**
 * @param {string} id
 * @param {Transaction~callback} callback
 * @param {number} [timeoutPeriod=30000] in milliseconds. Timeout until transaction is executed.
 * @constructor
 */
function Transaction(id, callback, timeoutPeriod) {
  this.id = id;
  timeoutPeriod = timeoutPeriod || 30000;
  var timeoutRejection;
  var self = this;
  this.promise = new Promise(function(resolve, reject) {
    self._callback = function() {
      clearTimeout(timeoutRejection);
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
    };

    timeoutRejection = setTimeout(function() {
      reject(new error.Error('Transaction timeout', 490));
    }, timeoutPeriod);
  });
  this._isExecuted = false;
}

/**
 * @param {...*}
 * @return {Promise}
 * @fulfilled {*}
 */
Transaction.prototype.execute = function() {
  if (!this._isExecuted) {
    this._isExecuted = true;
    this._callback.apply(this, arguments);
  }
  return this.promise;
};

/**
 * @return {string}
 */
Transaction.generateRandomId = function() {
  return Math.random().toString(36).substring(2, 12);
};

module.exports = Transaction;
