var Promise = require('bluebird');
var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaEntityPlugin = require('../media-entity-plugin');

function RtpbroadcastPlugin() {
  RtpbroadcastPlugin.super_.apply(this, arguments);

  /** @type {number} */
  this._currentMountpointId = null;
}

RtpbroadcastPlugin.NAME = 'janus.plugin.cm.rtpbroadcast';
Helpers.inherits(RtpbroadcastPlugin, MediaEntityPlugin);
Plugin.register(RtpbroadcastPlugin.NAME, RtpbroadcastPlugin);


/**
 * {@link https://github.com/cargomedia/janus-gateway-rtpbroadcast#create}
 * @typedef {Object} StreamParams
 */

/**
 * @param {string} mountpointId
 * @param {Object} [options]
 * @param {string} [options.name]
 * @param {string} [options.description]
 * @param {boolean} [options.recorded]
 * @param {string} [options.whitelist]
 * @param {StreamParams} [options.streams]

 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.create = function(mountpointId, options) {
  return this._create(Helpers.extend({id: mountpointId}, options));
};

/**
 * @param {string} mountpointId
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.destroy = function(mountpointId) {
  return this._destroy({id: mountpointId})
    .then(function() {
      if (mountpointId == this._currentMountpointId) {
        this._currentMountpointId = null;
      }
    }.bind(this));
};

/**
 * @param {string} [mountpointId]
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.list = function(mountpointId) {
  return this._list(mountpointId);
};

/**
 * @param {string} mountpointId
 * @param {Object} [answerOptions] {@link createAnswer}
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.watch = function(mountpointId, answerOptions) {
  var plugin = this;
  return this.sendWithTransaction({body: {request: 'watch', id: mountpointId}})
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
 * @param {string} mountpointId
 * @param {Array} streams
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.watchUDP = function(mountpointId, streams) {
  return this.sendWithTransaction({body: {request: 'watch-udp', id: mountpointId, streams: streams}});
};

/**
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.start = function() {
  return this.sendWithTransaction({body: {request: 'start'}});
};

/**
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.stop = function() {
  return this.sendWithTransaction({body: {request: 'stop'}})
};

/**
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.pause = function() {
  return this.sendWithTransaction({body: {request: 'pause'}});
};

/**
 * @param {string} mountpointId
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.switch = function(mountpointId) {
  return this.sendWithTransaction({body: {request: 'switch', id: mountpointId}})
    .then(function() {
      this._currentMountpointId = mountpointId;
    }.bind(this));
};

/**
 * @param {number} index
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.switchSource = function(index) {
  return this.sendWithTransaction({body: {request: 'switch-source', index: index}});
};

/**
 * @param {string} mountpointId
 * @param {Object} [answerOptions] {@link watch}
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.connect = function(mountpointId, answerOptions) {
  if (mountpointId == this._currentMountpointId) {
    return Promise.resolve();
  }
  if (this._currentMountpointId) {
    return this.switch(mountpointId);
  }
  return this.watch(mountpointId, answerOptions);
};

/**
 * @param {boolean} enabled
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype.superuser = function(enabled) {
  return this.sendWithTransaction({body: {request: 'superuser', enabled: enabled}});
};

/**
 * @param {RTCSessionDescription} jsep
 * @param {RTCAnswerOptions} [answerOptions]
 * @return {Promise}
 */
RtpbroadcastPlugin.prototype._startMediaStreaming = function(jsep, answerOptions) {
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

module.exports = RtpbroadcastPlugin;
