var Helpers = require('./helpers');
var JanusMessage = require('./janus-message');

/**
 * @param {JanusMessage} incomeMessage
 * @param {Plugin} plugin
 * @constructor
 * @extends JanusMessage
 */
function JanusPluginMessage(incomeMessage, plugin) {
  JanusPluginMessage.super_.apply(this, arguments);
  this._plugin = plugin;
}

Helpers.inherits(JanusPluginMessage, JanusMessage);

/**
 * @param {...string} [name]
 * @returns {*}
 */
JanusPluginMessage.prototype.getPluginData = function(name) {
  var names = Array.prototype.slice.call(arguments);
  names.unshift('plugindata', 'data');
  return this.get.apply(this, names);
};

/**
 * @returns {*}
 */
JanusPluginMessage.prototype.getError = function() {
  return this.getPluginData('error') || JanusPluginMessage.super_.prototype.getError.call(this);
};

/**
 * @returns {string}
 */
JanusPluginMessage.prototype.getResultText = function() {
  return this.getPluginData(this._plugin.getResponseAlias());
};

module.exports = JanusPluginMessage;
