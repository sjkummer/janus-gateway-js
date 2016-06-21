var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaAudioPlugin = require('../media-audio-plugin');

function AudiobridgePlugin() {
  AudiobridgePlugin.super_.apply(this, arguments);
}

AudiobridgePlugin.NAME = 'janus.plugin.audiobridge';
Helpers.inherits(AudiobridgePlugin, MediaAudioPlugin);
Plugin.register(AudiobridgePlugin.NAME, AudiobridgePlugin);

/**
 * @see https://janus.conf.meetecho.com/docs/janus__audiobridge_8c.html
 * @param {number} roomId
 * @param {Object} [options]
 * @param {boolean} [options.permanent]
 * @param {string} [options.description]
 * @param {string} [options.secret]
 * @param {string} [options.pin]
 * @param {boolean} [options.is_private]
 * @param {number} [options.sampling]
 * @param {boolean} [options.record]
 * @param {string} [options.record_file]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.create = function(roomId, options) {
  return this._create(Helpers.extend({room: roomId}, options));
};

/**
 * @param {number} roomId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.destroy = function(roomId, options) {
  return this._destroy(roomId, Helpers.extend({room: roomId}, options));
};

/**
 * @param {number} roomId
 * @param {Object} [options]
 * @param {number} [options.id]
 * @param {string} [options.pin]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.join = function(roomId, options) {
  options = Helpers.extend({room: roomId}, options);
  return this._join(roomId, options);
};

/**
 * @param {number} roomId
 * @param {Object} [options]
 * @param {number} [options.id]
 * @param {string} [options.pin]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.change = function(roomId, options) {
  options = Helpers.extend({room: roomId}, options);
  return this._change(roomId, options);
};

/**
 * @param {number} roomId
 * @param {Object} [options]
 * @param {number} [options.id]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.connect = function(roomId, options) {
  options = Helpers.extend({room: roomId}, options);
  return this._connect(roomId, options);
};

/**
 * @param {number} roomId
 * @return {Promise}
 */
AudiobridgePlugin.prototype.listParticipants = function(roomId) {
  return this._listParticipants({room: roomId});
};

module.exports = AudiobridgePlugin;
