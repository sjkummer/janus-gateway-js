var Helpers = require('./helpers');
var JanusMessage = require('./janus-message');

/**
 * @inheritDoc
 * @constructor
 */
function JanusPluginMessage(incomeMessage) {
  JanusPluginMessage.super_.apply(this, arguments);
}

Helpers.inherits(JanusPluginMessage, JanusMessage);

/**
 * @param {...string} [name]
 * @returns {Object}
 */
JanusPluginMessage.prototype.getData = function(name) {
  var names = Array.prototype.slice.call(arguments);
  names.unshift('plugindata', 'data');
  return this.get.apply(this, names);
};

/**
 * @returns {*}
 */
JanusPluginMessage.prototype.getError = function() {
  return this.getData('error') || JanusPluginMessage.super_.prototype.getError.call(this);
};

module.exports = JanusPluginMessage;
