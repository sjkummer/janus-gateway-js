var Helpers = require('./helpers');
var JanusMessage = require('./janus-message');

/**
 * @param {Object} plainMessage
 * @param {Plugin} plugin
 * @constructor
 * @extends JanusMessage
 */
function JanusPluginMessage(plainMessage, plugin) {
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
 * @returns {Object}
 */
JanusPluginMessage.prototype.getError = function() {
  var error = this.getPluginData('error');
  if (error) {
    return {
      reason: error,
      code: this.getPluginData('error_code')
    }
  }
  return JanusPluginMessage.super_.prototype.getError.call(this);
};

/**
 * @returns {string}
 */
JanusPluginMessage.prototype.getResultText = function() {
  return this.getPluginData(this._plugin.getResponseAlias());
};

module.exports = JanusPluginMessage;
