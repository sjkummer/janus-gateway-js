var Promise = require('bluebird');

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

Transaction.prototype.execute = function() {
  return this._callback.apply(this, arguments);
};

module.exports = Transaction;
