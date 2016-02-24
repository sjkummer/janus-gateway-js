var JanusConnection = require('./janus-connection');

function Janus(options) {
  this._options = options || {};
}

/**
 * @param {String} id
 * @return {Promise}
 */
Janus.prototype.createConnection = function(id) {
  var connection = JanusConnection.create(id, this._options);
  return connection.open();
};

module.exports = Janus;
