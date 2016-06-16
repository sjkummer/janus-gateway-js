var Promise = require('bluebird');
var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var TCrudPlugin = require('../../traits/t-crud-plugin');
var MediaPlugin = require('../media-plugin');

function AudiobridgePlugin() {
  AudiobridgePlugin.super_.apply(this, arguments);
}

AudiobridgePlugin.NAME = 'janus.plugin.audiobridge';
Helpers.inherits(AudiobridgePlugin, MediaPlugin);
Helpers.extend(AudiobridgePlugin.prototype, TCrudPlugin);
Plugin.register(AudiobridgePlugin.NAME, AudiobridgePlugin);

/**
 * @see https://janus.conf.meetecho.com/docs/janus__audiobridge_8c.html
 * @param {int} roomId
 * @param {Object} [options]
 * @param {boolean} [options.permanent]
 * @param {string} [options.description]
 * @param {string} [options.secret]
 * @param {string} [options.pin]
 * @param {boolean} [options.is_private]
 * @param {int} [options.sampling]
 * @param {boolean} [options.record]
 * @param {string} [options.record_file]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.createRoom = function(roomId, options) {
  return this._create(Helpers.extend({room: roomId}, options));
};

/**
 * @param {int} roomId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.destroyRoom = function(roomId, options) {
  return this._destroy(Helpers.extend({room: roomId}, options));
};

/**
 * @return {Promise}
 */
AudiobridgePlugin.prototype.listRooms = function() {
  return this._list();
};

/**
 * @param {int} roomId
 * @return {Promise}
 */
AudiobridgePlugin.prototype.listParticipants = function(roomId) {
  var body = {
    request: 'listparticipants',
    room: roomId
  };
  return this.sendWithDefaultTransaction({body: body})
    .then(function(response) {
      return response['plugindata']['data']['participants'];
    });
};

/**
 * @param {int} roomId
 * @param {Object} [options]
 * @param {int} [options.id]
 * @param {string} [options.pin]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {int} [options.quality]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.joinRoom = function(roomId, options) {
  var body = Helpers.extend({
    request: 'join',
    room: roomId
  }, options);
  return this.sendWithDefaultTransaction({body: body});
};

/**
 * @return {Promise}
 */
AudiobridgePlugin.prototype.leaveRoom = function() {
  return this.sendWithDefaultTransaction({body: {request: 'leave'}});
};

/**
 * @param {int} roomId
 * @param {Object} [options]
 * @param {int} [options.id]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {int} [options.quality]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.changeRoom = function(roomId, options) {
  var body = Helpers.extend({
    request: 'changeroom',
    room: roomId
  }, options);
  return this.sendWithDefaultTransaction({body: body});
};

/**
 * @param {Object} [options]
 * @param {boolean} [options.muted]
 * @param {int} [options.quality]
 * @param {RTCSessionDescription} [jsep]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.configure = function(options, jsep) {
  var body = Helpers.extend({
    request: 'configure'
  }, options);
  var message = {body: body};
  if (jsep) {
    message.jsep = jsep;
  }
  return this.sendWithDefaultTransaction(message);
};

/**
 * @param {Object} [configureOptions]
 * @param {boolean} [configureOptions.muted]
 * @param {int} [configureOptions.quality]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.startOffer = function(configureOptions) {
  var self = this;
  return Promise
    .try(function() {
      return self.getLocalMedia({audio: true, video: false});
    })
    .then(function(stream) {
      self.createPeerConnection();
      self.addStream(stream);
    })
    .then(function() {
      return self.createOffer();
    })
    .then(function(jsep) {
      return self.sendOffer(jsep, configureOptions);
    });
};

/**
 * @param {RTCSessionDescription} jsep
 * @param {Object} [configureOptions]
 * @param {boolean} [configureOptions.muted]
 * @param {int} [configureOptions.quality]
 * @return {Promise}
 */
AudiobridgePlugin.prototype.sendOffer = function(jsep, configureOptions) {
  return this.configure(configureOptions, jsep)
    .then(function(response) {
      var jsep = response['jsep'];
      if (jsep) {
        this.setRemoteSDP(jsep);
        return jsep;
      }
      return Promise.reject(new Error('Failed sendOffer. No jsep in response.'));
    }.bind(this));
};

module.exports = AudiobridgePlugin;
