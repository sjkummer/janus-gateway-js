var Connection = require('./connection');

function Client(options) {
  this._options = options || {};
}

/**
 * @param {String} id
 * @return {Promise}
 */
Client.prototype.createConnection = function(id) {
  var connection = Connection.create(id, this._options);
  return connection.open();
};

module.exports = Client;
