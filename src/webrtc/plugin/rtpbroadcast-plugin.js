var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaStreamPlugin = require('../media-stream-plugin');

function RtpbroadcastPlugin() {
  RtpbroadcastPlugin.super_.apply(this, arguments);
}

RtpbroadcastPlugin.NAME = 'janus.plugin.cm.rtpbroadcast';
Helpers.inherits(RtpbroadcastPlugin, MediaStreamPlugin);
Plugin.register(RtpbroadcastPlugin.NAME, RtpbroadcastPlugin);


/**
 * {@link https://github.com/cargomedia/janus-gateway-rtpbroadcast#create}
 * @typedef {Object} StreamParams
 */

/**
 * @param {string} id
 * @param {Object} [options]
 * @param {string} [options.name]
 * @param {string} [options.description]
 * @param {boolean} [options.recorded]
 * @param {string} [options.whitelist]
 * @param {StreamParams} [options.streams]

 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.create = function(id, options) {
  return this._create(id, options);
};

/**
 * @param {string} id
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.destroy = function(id) {
  return this._destroy(id);
};

/**
 * @param {string} [id]
 * @promise {Array} list
 */
RtpbroadcastPlugin.prototype.list = function(id) {
  return this._list(id);
};

/**
 * @param {string} id
 * @param {Object} [answerOptions] {@link createAnswer}
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.watch = function(id, answerOptions) {
  return this._watch(id, null, answerOptions);
};

/**
 * @param {string} id
 * @param {Array} streams
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.watchUDP = function(id, streams) {
  return this.sendWithTransaction({body: {request: 'watch-udp', id: id, streams: streams}});
};

/**
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.start = function() {
  return this._start();
};

/**
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.stop = function() {
  return this._stop();
};

/**
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.pause = function() {
  return this._pause();
};

/**
 * @param {string} id
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.switch = function(id) {
  return this._switch(id);
};

/**
 * @param {number} index
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.switchSource = function(index) {
  return this.sendWithTransaction({body: {request: 'switch-source', index: index}});
};

/**
 * @param {boolean} enabled
 * @promise {Object} response
 */
RtpbroadcastPlugin.prototype.superuser = function(enabled) {
  return this.sendWithTransaction({body: {request: 'superuser', enabled: enabled}});
};

module.exports = RtpbroadcastPlugin;
