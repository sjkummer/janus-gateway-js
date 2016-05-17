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

/**
 * @param {Object} [options] @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer#RTCOfferOptions_dictionary
 */
MediaPlugin.prototype.createOffer = function(options) {
  return this._createSDP('createOffer', options);
};

/**
 * @param {SessionDescription} jsep
 * @param {Object} [options] @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer#RTCAnswerOptions_dictionary
 */
MediaPlugin.prototype.createAnswer = function(jsep, options) {
  var self = this;
  return Promise.try(function() {
    return self._pc.setRemoteDescription(new webrtcsupport.SessionDescription(jsep));
  }).then(function() {
    return self._createSDP('createAnswer', options);
  });
};

/**
 * @param {string} party
 * @param {Object} [options]
 */
MediaPlugin.prototype._createSDP = function(party, options) {
  if (!this._pc) {
    throw new Error('Create PeerConnection before creating SDP for it');
  }
  if (['createOffer', 'createAnswer'].indexOf(party) < 0) {
    throw new Error('Unknown party in _createSDP');
  }

  this._iceListener = new IceCandidateListener(this._pc);
  var self = this;

  this._iceListener.on('candidate', function(candidate) {
    self.send({janus: 'trickle', candidate: candidate.toJSON()});
  });
  this._iceListener.on('complete', function() {
    self.send({janus: 'trickle', candidate: {completed: true}});
  });

  return this._pc[party](options)
    .then(function(description) {
      return self._pc.setLocalDescription(description);
    })
    .then(function() {
      return self._pc.localDescription;
    });
};
