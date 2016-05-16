var Promise = require('promise');
var webrtcsupport = require('webrtcsupport');
var Helpers = require('../helpers');
var Plugin = require('../plugin');
var MediaDevicesShim = require('./media-devices-shim');
var IceCandidateListener = require('./ice-candidate-listener');

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

MediaPlugin.prototype.createOffer = function(peerConnection, options) {
  options = Helpers.extend({trickle: true}, options);
  this._iceListener = new IceCandidateListener(peerConnection);

  if (options.trickle) {
    return this._createOfferTrickleYes(peerConnection, options);
  } else {
    return this._createOfferTrickleNo(peerConnection, options);
  }
};

MediaPlugin.prototype._createOfferTrickleYes = function(peerConnection, options) {
  var self = this;
  this._iceListener.on('candidate', function(candidate) {
    self.send({janus: 'trickle', candidate: candidate.toJSON()});
  });
  this._iceListener.on('complete', function() {
    self.send({janus: 'trickle', candidate: {completed: true}});
  });

  return peerConnection.createOffer(options)
    .then(function(offer) {
      peerConnection.setLocalDescription(offer);
      var jsep = {
        type: offer.type,
        sdp: offer.sdp
      };
      return jsep;
    });
};

MediaPlugin.prototype._createOfferTrickleNo = function(peerConnection, options) {
  var self = this;

  var offerPromise = peerConnection.createOffer(options)
    .then(function(offer) {
      peerConnection.setLocalDescription(offer);
    });

  var icePromise = new Promise(function(resolve) {
    self._iceListener.on('complete', resolve);
  }).timeout(5000);

  return Promise.join(offerPromise, icePromise).then(function() {
    return peerConnection.pc.localDescription;
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
