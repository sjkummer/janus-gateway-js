/**
 * @param {Object} plainMessage
 * @constructor
 */
 function JanusMessage(plainMessage) {
  this._plainMessage = plainMessage;
}

/**
 * @returns {Object}
 */
JanusMessage.prototype.getPlainMessage = function() {
  return this._plainMessage;
};

/**
 * @returns {Object}
 */
JanusMessage.prototype.getError = function() {
  return this.get('error');
};

/**
 * @param {...string} name
 * @returns {*}
 */
JanusMessage.prototype.get = function(name) {
  var names = Array.prototype.slice.call(arguments, 1);
  var result = this._plainMessage[name];
  console.log('name, result', arguments, names, name, result)
  for (var i = 0; i < names.length; i++) {
    name = names[i];
    if (result) {
      result = result[name];
    } else {
      break;
    }
  }
  console.log('result', result)
  return result || null;
};

module.exports = JanusMessage;
