var Promise = require('bluebird');
var Helpers = require('../helpers');
var MediaEntityPlugin = require('./media-entity-plugin');

function MediaAudioPlugin() {
  MediaAudioPlugin.super_.apply(this, arguments);

  /** @type {number} */
  this._currentRoomId = null;
}

Helpers.inherits(MediaAudioPlugin, MediaEntityPlugin);

/**
 * @param {string|number} id
 * @param {Object} options
 * @return {Promise}
 */
MediaAudioPlugin.prototype._destroy = function(id, options) {
  return MediaAudioPlugin.super_.prototype._destroy.call(this, options)
    .then(function() {
      if (id == this._currentRoomId) {
        this._currentRoomId = null;
      }
    }.bind(this));
};

/**
 * @param {string|number} id
 * @param {Object} options
 * @return {Promise}
 */
MediaAudioPlugin.prototype._join = function(id, options) {
  var body = Helpers.extend({request: 'join'}, options);
  return this.sendWithTransaction({body: body})
    .then(function() {
      this._currentRoomId = id;
    }.bind(this));
};

/**
 * @return {Promise}
 */
MediaAudioPlugin.prototype.leave = function() {
  return this.sendWithTransaction({body: {request: 'leave'}})
    .then(function() {
      this._currentRoomId = null;
    }.bind(this));
};

/**
 * @param {string|number} id
 * @param {Object} [options]
 * @return {Promise}
 */
MediaAudioPlugin.prototype._change = function(id, options) {
  var body = Helpers.extend({request: 'changeroom'}, options);
  return this.sendWithTransaction({body: body})
    .then(function() {
      this._currentRoomId = id;
    }.bind(this));
};

/**
 * @param {string|number} id
 * @param {Object} [options]
 * @return {Promise}
 */
MediaAudioPlugin.prototype._connect = function(id, options) {
  if (id == this._currentRoomId) {
    return Promise.resolve();
  }
  if (this._currentRoomId) {
    return this._change(id, options);
  }
  return this._join(id, options);
};

/**
 * @return {Promise}
 */
MediaAudioPlugin.prototype.list = function() {
  return this._list();
};

/**
 * @param {Object} [options]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @param {RTCSessionDescription} [jsep]
 * @return {Promise}
 */
MediaAudioPlugin.prototype.configure = function(options, jsep) {
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
 * @return {Promise}
 */
MediaAudioPlugin.prototype.startMediaStreaming = function(offerOptions, configureOptions) {
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
 * @return {Promise}
 */
MediaAudioPlugin.prototype.sendSDP = function(jsep, configureOptions) {
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

/**
 * @param {Object} options
 * @return {Promise}
 */
MediaAudioPlugin.prototype._listParticipants = function(options) {
  var body = Helpers.extend({request: 'listparticipants'}, options);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      return response['plugindata']['data']['participants'];
    });
};

module.exports = MediaAudioPlugin;
