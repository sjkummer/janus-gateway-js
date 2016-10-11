var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaStreamPlugin = require('../media-stream-plugin');

function StreamingPlugin() {
  StreamingPlugin.super_.apply(this, arguments);
}

StreamingPlugin.NAME = 'janus.plugin.streaming';
Helpers.inherits(StreamingPlugin, MediaStreamPlugin);
Plugin.register(StreamingPlugin.NAME, StreamingPlugin);

/**
 * @see https://janus.conf.meetecho.com/docs/janus__streaming_8c.html
 * @param {number} id
 * @param {Object} [options]
 * @param {string} [options.type]
 * @param {string} [options.secret]
 * @param {string} [options.pin]
 * @param {boolean} [options.permanent]
 * @param {string} [options.description]
 * @param {boolean} [options.is_private]
 * @param {string} [options.filename]
 * @param {boolean} [options.audio]
 * @param {boolean} [options.video]
 * @param {number} [options.audioport]
 * @param {string} [options.audiomcast]
 * @param {number} [options.audiopt]
 * @param {string} [options.audiortpmap]
 * @param {string} [options.audiofmtp]
 * @param {number} [options.videoport]
 * @param {string} [options.videomcast]
 * @param {number} [options.videopt]
 * @param {string} [options.videortpmap]
 * @param {string} [options.videofmtp]
 * @param {boolean} [options.videobufferkf]
 * @param {string} [options.url]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.create = function(id, options) {
  return this._create(id, options);
};

/**
 * @param {number} id
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.destroy = function(id, options) {
  return this._destroy(id, options);
};

/**
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.list = function() {
  return this._list();
};

/**
 * @param {number} id
 * @param {Object} [watchOptions]
 * @param {string} [watchOptions.pin]
 * @param {Object} [answerOptions] {@link createAnswer}
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.watch = function(id, watchOptions, answerOptions) {
  return this._watch(id, watchOptions, answerOptions);
};

/**
 * @param {RTCSessionDescription} [jsep]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.start = function(jsep) {
  return this._start(jsep);
};

/**
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.stop = function() {
  return this._stop();
};

/**
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.pause = function() {
  return this._pause();
};

/**
 * @param {number} mountpointId
 * @param {Object} [options] {@link watch}
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.switch = function(mountpointId, options) {
  return this._switch(mountpointId, options);
};

/**
 * @param {number} mountpointId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.enable = function(mountpointId, options) {
  var body = Helpers.extend({
    request: 'enable',
    id: mountpointId
  }, options);
  return this.sendWithTransaction({body: body})
};

/**
 * @param {number} mountpointId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.disable = function(mountpointId, options) {
  var body = Helpers.extend({
    request: 'disable',
    id: mountpointId
  }, options);
  return this.sendWithTransaction({body: body})
    .then(function() {
      if (this.hasCurrentEntity(mountpointId)) {
        this.resetCurrentEntity();
      }
    }.bind(this));
};

/**
 * @param {number} mountpointId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {string} [options.action]
 * @param {string} [options.audio]
 * @param {string} [options.video]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
StreamingPlugin.prototype.recording = function(mountpointId, options) {
  var body = Helpers.extend({
    request: 'recording',
    id: mountpointId
  }, options);
  return this.sendWithTransaction({body: body});
};

/**
 * @inheritDoc
 */
StreamingPlugin.prototype.getResponseAlias = function() {
  return 'streaming';
};

module.exports = StreamingPlugin;
