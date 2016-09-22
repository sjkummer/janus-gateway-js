/**
 * @param {Object} message
 * @constructor
 */
function JanusMessage(message) {
  this._message = message;
}

/**
 * @returns {Object}
 */
JanusMessage.prototype.getMessage = function() {
  return this._message;
};

/**
 * @returns {*}
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
  var result = this._message[name];

  for (var i = 0; i < names.length; i++) {
    name = names[i];
    if (result) {
      result = result[name];
    } else {
      break;
    }
  }

  return result || null;
};

module.exports = JanusMessage;
