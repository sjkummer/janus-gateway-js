var util = require('util');

/**
 * @param {string} reason
 * @param {number} code
 * @param {Object} janusMessage
 * @constructor
 */
function JanusError(reason, code, janusMessage) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = reason;
  this.code = code;
  this.janusMessage = janusMessage
}

util.inherits(JanusError, Error);

/**
 * @param {Object} janusMessage
 * @constructor
 * @extends JanusError
 */
function ConnectionError(janusMessage) {
  var code = 500;
  var reason = 'Unknown error';
  var error = janusMessage['error'];
  if (error) {
    reason = error['reason'];
    code = error['code'];
  }
  ConnectionError.super_.call(this, reason, code, janusMessage);
}
util.inherits(ConnectionError, JanusError);

module.exports.Error = JanusError;
module.exports.ConnectionError = ConnectionError;
