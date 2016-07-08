/**
 * @param {Object} response
 * @constructor
 */
function PluginResponse(response) {
  this._response = response;
}

/**
 * @returns {*}
 */
PluginResponse.prototype.getError = function() {
  return this.getData('error') || this.get('error');
};

/**
 * @param {..String} [name]
 * @returns {Object}
 */
PluginResponse.prototype.getData = function(name) {
  var names = Array.prototype.slice.call(arguments);
  names.unshift('plugindata', 'data');
  return this.get.apply(this, names);
};

/**
 * @param {..String} name
 * @returns {*}
 */
PluginResponse.prototype.get = function(name) {
  var names = Array.prototype.slice.call(arguments, 1);
  var result = this._response[name];

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

module.exports = PluginResponse;
