var Promise = require('bluebird');

/**
 * @callback Transaction~callback
 * @return {Promise}
 */

/**
 * @param {String} id
 * @param {Transaction~callback} callback
 * @constructor
 */
function Transaction(id, callback) {
  this.id = id;
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
  });
}

/**
 * @param {...*}
 * @return {Promise}
 */
Transaction.prototype.execute = function() {
  return this._callback.apply(this, arguments);
};

module.exports = Transaction;
