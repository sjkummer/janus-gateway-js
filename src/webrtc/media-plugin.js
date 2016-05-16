var webrtcsupport = require('webrtcsupport');
var Helpers = require('../helpers');
var Plugin = require('../plugin');
var MediaDevicesShim = require('./media-devices-shim');

/**
 * @inheritDoc
 *
 * @constructor
 * @extends Plugin
 */
function MediaPlugin(session, name, id) {
  if (!webrtcsupport.support) {
    throw new Error('WebRTC is not supported');
  }
  MediaPlugin.super_.apply(this, arguments);
}

Helpers.inherits(MediaPlugin, Plugin);

/**
 */
MediaPlugin.prototype.createOffer = function(peerConnection, options) {
  options = Helpers.extend({trickle: true}, options);

  return peerConnection.createOffer(options)
    .then(function(desc) {
      peerConnection.setLocalDescription(desc);
      //signalingChannel.send(JSON.stringify({"sdp": desc}));
    });
};

MediaPlugin.prototype.createAnswer = function() {
};

/**
 * @param {Object} [options]
 * @param [stream]
 * @returns {PeerConnection}
 */
MediaPlugin.prototype.createPeerConnection = function(options, stream) {
  options = Helpers.extend(options || {}, this._session._connection._options.pc);

  var config = {
    iceServers: [{url: 'stun:stun.l.google.com:19302'}]
  };
  var constraints = {
    'optional': [{'DtlsSrtpKeyAgreement': true}]
  };
  if (options.config) {
    Helpers.extend(config, options.config);
  }
  if (options.constraints) {
    Helpers.extend(constraints, options.constraints);
  }

  var pc = new webrtcsupport.PeerConnection(config, constraints);
  if (stream) {
    pc.addStream(stream);
  }
  this._pc = pc;

  return pc;
};

/**
 * According to https://w3c.github.io/mediacapture-main/getusermedia.html#media-track-constraints there are no constraints as `offerToReceiveVideo`
 *
 * @param {Object} constraints https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Parameters
 * @return {Promise}
 */
MediaPlugin.prototype.getLocalMedia = function(constraints) {
  this.emit('consent-dialog:start');
  var self = this;
  var promise = MediaDevicesShim.getUserMedia(constraints);
  return promise
    .then(function(stream) {
      self.emit('consent-dialog:stop', {stream: stream});
      return stream;
    })
    .catch(function(error) {
      self.emit('consent-dialog:stop', {error: error});
      throw error;
    })
    .finally(function() {
      if (promise.isCancelled()) {
        self.emit('consent-dialog:stop');
      }
    });
};
