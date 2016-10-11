var Promise = require('bluebird');
var Helpers = require('../helpers');
var JanusPluginMessage = require('../janus-plugin-message');
var MediaEntityPlugin = require('./media-entity-plugin');

function MediaAudioPlugin() {
  MediaAudioPlugin.super_.apply(this, arguments);
}

Helpers.inherits(MediaAudioPlugin, MediaEntityPlugin);

/**
 * @param {string|number} id
 * @param {Object} options
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
MediaAudioPlugin.prototype._join = function(id, options) {
  var body = Helpers.extend({request: 'join'}, options);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      this.setCurrentEntity(id);
      return response;
    }.bind(this));
};

/**
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
MediaAudioPlugin.prototype.leave = function() {
  return this.sendWithTransaction({body: {request: 'leave'}})
    .then(function(response) {
      this.resetCurrentEntity();
      return response;
    }.bind(this));
};

/**
 * @param {string|number} id
 * @param {Object} [options]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
MediaAudioPlugin.prototype._change = function(id, options) {
  var body = Helpers.extend({request: 'changeroom'}, options);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      this.setCurrentEntity(id);
      return response;
    }.bind(this));
};

/**
 * @param {string|number} id
 * @param {Object} [options]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
MediaAudioPlugin.prototype._connect = function(id, options) {
  if (this.hasCurrentEntity(id)) {
    return Promise.resolve(new JanusPluginMessage({}, this));
  }
  if (this.hasCurrentEntity()) {
    return this._change(id, options);
  }
  return this._join(id, options);
};

/**
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
MediaAudioPlugin.prototype.list = function() {
  return this._list();
};

/**
 * @param {Object} [options]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @param {RTCSessionDescription} [jsep]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
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
 * @param {MediaStream} stream
 * @param {RTCOfferOptions} [offerOptions]
 * @param {Object} [configureOptions]
 * @param {boolean} [configureOptions.muted]
 * @param {number} [configureOptions.quality]
 * @returns {Promise}
 * @fulfilled {@link sendSDP}
 */
MediaAudioPlugin.prototype.offerStream = function(stream, offerOptions, configureOptions) {
  var self = this;
  return Promise
    .try(function() {
      self.createPeerConnection();
      stream.getAudioTracks().forEach(function(track) {
        self.addTrack(track, stream);
      });
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
 * @returns {Promise}
 * @fulfilled {RTCSessionDescription}
 */
MediaAudioPlugin.prototype.sendSDP = function(jsep, configureOptions) {
  return this.configure(configureOptions, jsep)
    .then(function(response) {
      var jsep = response.get('jsep');
      if (jsep) {
        this.setRemoteSDP(jsep);
        return jsep;
      }
      return Promise.reject(new Error('Failed sendSDP. No jsep in response.'));
    }.bind(this));
};

/**
 * @param {Object} options
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} list
 */
MediaAudioPlugin.prototype._listParticipants = function(options) {
  var body = Helpers.extend({request: 'listparticipants'}, options);
  return this.sendWithTransaction({body: body});
};

module.exports = MediaAudioPlugin;
