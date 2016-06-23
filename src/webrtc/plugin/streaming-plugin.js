var Promise = require('bluebird');
var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaEntityPlugin = require('../media-entity-plugin');

function StreamingPlugin() {
  StreamingPlugin.super_.apply(this, arguments);

  /** @type {number} */
  this._currentMountpointId = null;
}

StreamingPlugin.NAME = 'janus.plugin.streaming';
Helpers.inherits(StreamingPlugin, MediaEntityPlugin);
Plugin.register(StreamingPlugin.NAME, StreamingPlugin);

/**
 * @see https://janus.conf.meetecho.com/docs/janus__streaming_8c.html
 * @param {number} mountpointId
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

 * @promise {@link MediaEntityPlugin._create}
 */
StreamingPlugin.prototype.create = function(mountpointId, options) {
  return this._create(Helpers.extend({id: mountpointId}, options));
};

/**
 * @param {number} mountpointId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @promise {@link MediaEntityPlugin._destroy}
 */
StreamingPlugin.prototype.destroy = function(mountpointId, options) {
  return this._destroy(Helpers.extend({id: mountpointId}, options))
    .then(function(response) {
      if (mountpointId == this._currentMountpointId) {
        this._currentMountpointId = null;
      }
      return response;
    }.bind(this));
};

/**
 * @promise {@link MediaEntityPlugin._list}
 */
StreamingPlugin.prototype.list = function() {
  return this._list();
};

/**
 * @param {number} mountpointId
 * @param {Object} [watchOptions]
 * @param {string} [watchOptions.pin]
 * @param {Object} [answerOptions] {@link createAnswer}
 * @promise {Object} response
 */
StreamingPlugin.prototype.watch = function(mountpointId, watchOptions, answerOptions) {
  var plugin = this;
  var body = Helpers.extend({
    request: 'watch',
    id: mountpointId
  }, watchOptions);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      var jsep = response['jsep'];
      if (!jsep || 'offer' != jsep['type']) {
        throw new Error('Expect offer response on watch request')
      }
      plugin._currentMountpointId = mountpointId;
      return plugin._startMediaStreaming(jsep, answerOptions).return(response);
    });
};

/**
 * @param {RTCSessionDescription} [jsep]
 * @promise {Object} response
 */
StreamingPlugin.prototype.start = function(jsep) {
  var message = {body: {request: 'start'}};
  if (jsep) {
    message.jsep = jsep;
  }
  return this.sendWithTransaction(message);
};

/**
 * @promise {Object} response
 */
StreamingPlugin.prototype.stop = function() {
  return this.sendWithTransaction({body: {request: 'stop'}})
    .then(function(response) {
      this._currentMountpointId = null;
      return response;
    }.bind(this));
};

/**
 * @promise {Object} response
 */
StreamingPlugin.prototype.pause = function() {
  return this.sendWithTransaction({body: {request: 'pause'}});
};

/**
 * @param {number} mountpointId
 * @param {Object} [options] {@link watch}
 * @promise {Object} response
 */
StreamingPlugin.prototype.switch = function(mountpointId, options) {
  var body = Helpers.extend({
    request: 'switch',
    id: mountpointId
  }, options);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      this._currentMountpointId = mountpointId;
      return response;
    }.bind(this));
};

/**
 * @param {number} mountpointId
 * @param {Object} [watchOptions] {@link watch}
 * @param {Object} [answerOptions] {@link createAnswer}
 * @promise {Object} response
 */
StreamingPlugin.prototype.connect = function(mountpointId, watchOptions, answerOptions) {
  if (mountpointId == this._currentMountpointId) {
    return Promise.resolve();
  }
  if (this._currentMountpointId) {
    return this.switch(mountpointId, watchOptions);
  }
  return this.watch(mountpointId, watchOptions, answerOptions);
};

/**
 * @param {number} mountpointId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @promise {Object} response
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
 * @promise {Object} response
 */
StreamingPlugin.prototype.disable = function(mountpointId, options) {
  var body = Helpers.extend({
    request: 'disable',
    id: mountpointId
  }, options);
  return this.sendWithTransaction({body: body})
    .then(function() {
      if (mountpointId == this._currentMountpointId) {
        this._currentMountpointId = null;
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
 * @promise {Object} response
 */
StreamingPlugin.prototype.recording = function(mountpointId, options) {
  var body = Helpers.extend({
    request: 'recording',
    id: mountpointId
  }, options);
  return this.sendWithTransaction({body: body});
};

/**
 * @param {RTCSessionDescription} jsep
 * @param {RTCAnswerOptions} [answerOptions]
 * @promise when start message is sent
 */
StreamingPlugin.prototype._startMediaStreaming = function(jsep, answerOptions) {
  var self = this;
  return Promise
    .try(function() {
      self.createPeerConnection();
    })
    .then(function() {
      return self.createAnswer(jsep, answerOptions);
    })
    .then(function(jsep) {
      return self.send({janus: 'message', body: {request: 'start'}, jsep: jsep});
    });
};

module.exports = StreamingPlugin;
