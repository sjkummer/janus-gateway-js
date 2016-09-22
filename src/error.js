var Helpers = require('./helpers');

/**
 * @param {string} reason
 * @param {number} code
 * @param {JanusMessage} [janusMessage]
 * @constructor
 */
function JanusError(reason, code, janusMessage) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = reason;
  this.code = code;
  this.janusMessage = janusMessage
}

Helpers.inherits(JanusError, Error);

/**
 * @param {JanusMessage} janusMessage
 * @constructor
 * @extends JanusError
 */
function ConnectionError(janusMessage) {
  var code = 500;
  var reason = 'Unknown error';
  var error = janusMessage.getError();
  if (error) {
    reason = error['reason'];
    code = error['code'];
  }
  ConnectionError.super_.call(this, reason, code, janusMessage);
}
Helpers.inherits(ConnectionError, JanusError);

module.exports.Error = JanusError;
module.exports.ConnectionError = ConnectionError;
