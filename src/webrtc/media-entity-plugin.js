var Helpers = require('../helpers');
var MediaPlugin = require('./media-plugin');

function MediaEntityPlugin() {
  MediaEntityPlugin.super_.apply(this, arguments);
}

Helpers.inherits(MediaEntityPlugin, MediaPlugin);

/**
 * @param {Object} options
 * @promise {Object} response['plugindata']['data']
 */
MediaEntityPlugin.prototype._create = function(options) {
  var body = Helpers.extend({request: 'create'}, options);
  return this.sendWithTransaction({body: body})
    .catch(function(error) {
      if (error.message.indexOf('already exists') > 0) {
        return error.response;
      } else {
        throw error;
      }
    })
    .then(function(response) {
      return response['plugindata']['data'];
    });
};

/**
 * @param {Object} options
 * @promise {Object} response
 */
MediaEntityPlugin.prototype._destroy = function(options) {
  var body = Helpers.extend({request: 'destroy'}, options);
  return this.sendWithTransaction({body: body});
};

/**
 * @promise {Array} response['plugindata']['data']['list']
 */
MediaEntityPlugin.prototype._list = function() {
  return this.sendWithTransaction({body: {request: 'list'}})
    .then(function(response) {
      return response['plugindata']['data']['list'];
    });
};

module.exports = MediaEntityPlugin;
