var util = require('util');

function JanusError(reason, code, janusMessage) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = reason;
  this.code = code;
  this.janusMessage = janusMessage
}

util.inherits(JanusError, Error);

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

module.exports.JanusError = JanusError;
module.exports.ConnectionError = ConnectionError;
