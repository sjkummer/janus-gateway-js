var Helpers = require('../helpers');
var MediaPlugin = require('./media-plugin');

function MediaEntityPlugin() {
  MediaEntityPlugin.super_.apply(this, arguments);

  this._currentEntityId = null;
}

Helpers.inherits(MediaEntityPlugin, MediaPlugin);

/**
 * @param {string|number} [id]
 * @return {boolean}
 */
MediaEntityPlugin.prototype.hasCurrentEntity = function(id) {
  if (id) {
    return id === this._currentEntityId;
  }
  return !!this._currentEntityId;
};

/**
 * @param {string|number} id
 */
MediaEntityPlugin.prototype.setCurrentEntity = function(id) {
  this._currentEntityId = id;
};

MediaEntityPlugin.prototype.resetCurrentEntity = function() {
  this._currentEntityId = null;
};

/**
 * @param {Object} options
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
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
    });
};

/**
 * @param {string|number} id
 * @param {Object} options
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
MediaEntityPlugin.prototype._destroy = function(id, options) {
  var body = Helpers.extend({request: 'destroy'}, options);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      if (this.hasCurrentEntity(id)) {
        this.resetCurrentEntity();
      }
      return response;
    }.bind(this));
};

/**
 * @param {Object} [options]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
MediaEntityPlugin.prototype._list = function(options) {
  var body = Helpers.extend({request: 'list'}, options);
  return this.sendWithTransaction({body: body});
};

/**
 * @inheritDoc
 */
MediaEntityPlugin.prototype._onHangup = function(incomeMessage) {
  this.resetCurrentEntity();
  return MediaEntityPlugin.super_.prototype._onHangup.call(this, incomeMessage);
};

module.exports = MediaEntityPlugin;
