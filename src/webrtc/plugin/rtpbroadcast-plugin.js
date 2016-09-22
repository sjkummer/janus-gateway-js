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
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.create = function(id, options) {
  return this._create(id, options);
};

/**
 * @param {string} id
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.destroy = function(id) {
  return this._destroy(id);
};

/**
 * @param {string} [id]
 * @returns {Promise}
 * @fulfilled {Array} list
 */
RtpbroadcastPlugin.prototype.list = function(id) {
  return this._list(id);
};

/**
 * @param {string} id
 * @param {Object} [answerOptions] {@link createAnswer}
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.watch = function(id, answerOptions) {
  return this._watch(id, null, answerOptions);
};

/**
 * @param {string} id
 * @param {Array} streams
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.watchUDP = function(id, streams) {
  return this.sendWithTransaction({body: {request: 'watch-udp', id: id, streams: streams}});
};

/**
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.start = function() {
  return this._start();
};

/**
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.stop = function() {
  return this._stop();
};

/**
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.pause = function() {
  return this._pause();
};

/**
 * @param {string} id
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.switch = function(id) {
  return this._switch(id);
};

/**
 * @param {number} index
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.switchSource = function(index) {
  return this.sendWithTransaction({body: {request: 'switch-source', index: index}});
};

/**
 * @param {boolean} enabled
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
RtpbroadcastPlugin.prototype.superuser = function(enabled) {
  return this.sendWithTransaction({body: {request: 'superuser', enabled: enabled}});
};

/**
 * @inheritDoc
 */
RtpbroadcastPlugin.prototype.getResponseAlias = function() {
  return 'streaming';
};

module.exports = RtpbroadcastPlugin;
