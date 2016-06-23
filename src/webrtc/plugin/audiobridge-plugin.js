var Promise = require('bluebird');
var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaEntityPlugin = require('../media-entity-plugin');

function AudiobridgePlugin() {
  AudiobridgePlugin.super_.apply(this, arguments);

  /** @type {number} */
  this._currentRoomId = null;
}

AudiobridgePlugin.NAME = 'janus.plugin.audiobridge';
Helpers.inherits(AudiobridgePlugin, MediaEntityPlugin);
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
 * @promise {@link MediaEntityPlugin._create}
 */
AudiobridgePlugin.prototype.create = function(roomId, options) {
  return this._create(Helpers.extend({room: roomId}, options));
};

/**
 * @param {number} roomId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @promise {@link MediaEntityPlugin._destroy}
 */
AudiobridgePlugin.prototype.destroy = function(roomId, options) {
  return this._destroy(Helpers.extend({room: roomId}, options))
    .then(function() {
      if (roomId == this._currentRoomId) {
        this._currentRoomId = null;
      }
    }.bind(this));
};

/**
 * @promise {@link MediaEntityPlugin._list}
 */
AudiobridgePlugin.prototype.list = function() {
  return this._list();
};

/**
 * @param {number} roomId
 * @promise {Array} participants
 */
AudiobridgePlugin.prototype.listParticipants = function(roomId) {
  var body = {
    request: 'listparticipants',
    room: roomId
  };
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      return response['plugindata']['data']['participants'];
    });
};

/**
 * @param {number} roomId
 * @param {Object} [options]
 * @param {number} [options.id]
 * @param {string} [options.pin]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @promise {Object} response
 */
AudiobridgePlugin.prototype.join = function(roomId, options) {
  var body = Helpers.extend({
    request: 'join',
    room: roomId
  }, options);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      this._currentRoomId = roomId;
      return response;
    }.bind(this));
};

/**
 * @promise {Object} response
 */
AudiobridgePlugin.prototype.leave = function() {
  return this.sendWithTransaction({body: {request: 'leave'}})
    .then(function(response) {
      this._currentRoomId = null;
      return response;
    }.bind(this));
};

/**
 * @param {number} roomId
 * @param {Object} [options]
 * @param {number} [options.id]
 * @param {string} [options.pin]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @promise {Object} response
 */
AudiobridgePlugin.prototype.change = function(roomId, options) {
  var body = Helpers.extend({
    request: 'changeroom',
    room: roomId
  }, options);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      this._currentRoomId = roomId;
      return response;
    }.bind(this));
};

/**
 * @param {number} roomId
 * @param {Object} [options]
 * @param {number} [options.id]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @promise {Object} response
 */
AudiobridgePlugin.prototype.connect = function(roomId, options) {
  if (roomId == this._currentRoomId) {
    return Promise.resolve();
  }
  if (this._currentRoomId) {
    return this.change(roomId, options);
  }
  return this.join(roomId, options);
};

/**
 * @param {Object} [options]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @param {RTCSessionDescription} [jsep]
 * @promise {Object} response
 */
AudiobridgePlugin.prototype.configure = function(options, jsep) {
  var body = Helpers.extend({
    request: 'configure'
  }, options);
  var message = {body: body};
  if (jsep) {
    message.jsep = jsep;
  }
  return this.sendWithTransaction(message);
};

/**
 * @param {RTCOfferOptions} [offerOptions]
 * @param {Object} [configureOptions]
 * @param {boolean} [configureOptions.muted]
 * @param {number} [configureOptions.quality]
 * @promise {@link sendSDP}
 */
AudiobridgePlugin.prototype.startMediaStreaming = function(offerOptions, configureOptions) {
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
      return self.createOffer(offerOptions);
    })
    .then(function(jsep) {
      return self.sendSDP(jsep, configureOptions);
    });
};

/**
 * @param {RTCSessionDescription} jsep
 * @param {Object} [configureOptions]
 * @param {boolean} [configureOptions.muted]
 * @param {number} [configureOptions.quality]
 * @promise {RTCSessionDescription}
 */
AudiobridgePlugin.prototype.sendSDP = function(jsep, configureOptions) {
  return this.configure(configureOptions, jsep)
    .then(function(response) {
      var jsep = response['jsep'];
      if (jsep) {
        this.setRemoteSDP(jsep);
        return jsep;
      }
      return Promise.reject(new Error('Failed sendSDP. No jsep in response.'));
    }.bind(this));
};

module.exports = AudiobridgePlugin;
