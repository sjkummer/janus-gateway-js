var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaAudioPlugin = require('../media-audio-plugin');

function AudioroomPlugin() {
  AudioroomPlugin.super_.apply(this, arguments);
}

AudioroomPlugin.NAME = 'janus.plugin.cm.audioroom';
Helpers.inherits(AudioroomPlugin, MediaAudioPlugin);
Plugin.register(AudioroomPlugin.NAME, AudioroomPlugin);

/**
 * @param {string} id
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @promise {Object} response
 */
AudioroomPlugin.prototype.destroy = function(id, options) {
  return this._destroy(id, Helpers.extend({id: id}, options));
};

/**
 * @param {string} id
 * @param {Object} [options]
 * @param {number} [options.userid]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @promise {Object} response
 */
AudioroomPlugin.prototype.join = function(id, options) {
  options = Helpers.extend({id: id}, options);
  return this._join(id, options);
};

/**
 * @param {string} id
 * @param {Object} [options] {@link join}
 * @promise {Object} response
 */
AudioroomPlugin.prototype.change = function(id, options) {
  options = Helpers.extend({id: id}, options);
  return this._change(id, options);
};

/**
 * @param {string} id
 * @param {Object} [options] {@link join}
 * @promise {Object} response
 */
AudioroomPlugin.prototype.connect = function(id, options) {
  options = Helpers.extend({id: id}, options);
  return this._connect(id, options);
};

/**
 * @param {string} id
 * @promise {Array} list
 */
AudioroomPlugin.prototype.listParticipants = function(id) {
  return this._listParticipants({id: id});
};

module.exports = AudioroomPlugin;
