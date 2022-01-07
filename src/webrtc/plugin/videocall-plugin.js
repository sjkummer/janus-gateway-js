var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaVideoPlugin = require('../media-video-plugin');

function VideocallPlugin() {
  VideocallPlugin.super_.apply(this, arguments);
}

VideocallPlugin.NAME = 'janus.plugin.videocall';
Helpers.inherits(VideocallPlugin, MediaVideoPlugin);
Plugin.register(VideocallPlugin.NAME, VideocallPlugin);

/**
 * @param {string} id
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.destroy = function(id, options) {
  return this._destroy(id, Helpers.extend({id: id}, options));
};

/**
 * @param {string} id
 * @param {Object} [options]
 * @param {number} [options.userid]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.join = function(id, options) {
  options = Helpers.extend({id: id}, options);
  return this._join(id, options);
};

/**
 * @param {string} id
 * @param {Object} [options] {@link join}
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.change = function(id, options) {
  options = Helpers.extend({id: id}, options);
  return this._change(id, options);
};

/**
 * @param {string} id
 * @param {Object} [options] {@link join}
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.connect = function(id, options) {
  options = Helpers.extend({id: id}, options);
  return this._connect(id, options);
};

/**
 * @param {string} id
 * @returns {Promise}
 * @fulfilled {Array} list
 */
VideocallPlugin.prototype.listParticipants = function(id) {
  return this._listParticipants({id: id});
};

/**
 * @inheritDoc
 */
VideocallPlugin.prototype.getResponseAlias = function() {
  return 'videocall';
};

module.exports = VideocallPlugin;
