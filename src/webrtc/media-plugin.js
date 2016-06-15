var Promise = require('bluebird');
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

  this._pcListeners = {};
}

Helpers.inherits(MediaPlugin, Plugin);

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#RTCConfiguration_dictionary
 * @typedef {Object} RTCConfiguration
 */

/**
 * @param {RTCConfiguration} [options]
 * @return {RTCPeerConnection}
 */
MediaPlugin.prototype.createPeerConnection = function(options) {
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

  this._pc = new webrtcsupport.PeerConnection(config, constraints);
  this._addPcEventListeners();
  return this._pc;
};

/**
 * @param {MediaStream} stream
 */
MediaPlugin.prototype.addStream = function(stream) {
  this._pc.addStream(stream);
};

/**
 * @param {MediaStreamConstraints} constraints
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
 * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer#RTCOfferOptions_dictionary
 * @typedef {Object} RTCOfferOptions
 */

/**
 * @param {RTCOfferOptions} [options]
 * @return {Promise}
 */
MediaPlugin.prototype.createOffer = function(options) {
  return this._createSDP('createOffer', options);
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer#RTCAnswerOptions_dictionary
 * @typedef {Object} RTCAnswerOptions
 */

/**
 * @param {RTCSessionDescription} jsep
 * @param {RTCAnswerOptions} [options]
 * @return {Promise}
 */
MediaPlugin.prototype.createAnswer = function(jsep, options) {
  var self = this;
  return Promise.try(function() {
    return self.setRemoteSDP(jsep);
  }).then(function() {
    return self._createSDP('createAnswer', options);
  });
};

/**
 * @param {RTCSessionDescription} jsep
 * @return {Promise}
 */
MediaPlugin.prototype.setRemoteSDP = function(jsep) {
  return this._pc.setRemoteDescription(new webrtcsupport.SessionDescription(jsep));
};

/**
 * @param {string} party
 * @param {RTCAnswerOptions|RTCOfferOptions} [options]
 * @return {Promise}
 */
MediaPlugin.prototype._createSDP = function(party, options) {
  if (!this._pc) {
    throw new Error('Create PeerConnection before creating SDP for it');
  }
  if (['createOffer', 'createAnswer'].indexOf(party) < 0) {
    throw new Error('Unknown party in _createSDP');
  }

  options = options || {};
  var self = this;
  return this._pc[party](options)
    .then(function(description) {
      return self._pc.setLocalDescription(description);
    })
    .then(function() {
      return self._pc.localDescription;
    });
};

MediaPlugin.prototype.processIncomeMessage = function(message) {
  var self = this;
  return Promise.try(function() {
      return MediaPlugin.super_.prototype.processIncomeMessage.call(self, message);
    })
    .then(function(result) {
      if ('trickle' == message['janus']) {
        self._onTrickle(message);
      }
      return result;
    });
};

/**
 * @param {Object} incomeMessage
 */
MediaPlugin.prototype._onTrickle = function(incomeMessage) {
  var candidate = new webrtcsupport.IceCandidate(incomeMessage['candidate']);
  this._pc.addIceCandidate(candidate).catch(function(error) {
    this.emit('error', error);
  }.bind(this));
};

MediaPlugin.prototype.closePeerConnection = function() {
  Object.keys(this._pcListeners)
    .forEach(function(event) {
      this._removePcEventListener(event);
    }.bind(this));
  this._pc.close();
  this._pc = null;
  this.emit('pc:close');
};

MediaPlugin.prototype._addPcEventListeners = function() {
  var self = this;

  this._addPcEventListener('addstream', function(event) {
    self.emit('addstream', event);
  });
  this._addPcEventListener('track', function(event) {
    self.emit('addstream', event);
  });

  this._addPcEventListener('icecandidate', function(event) {
    if (event.candidate) {
      self.send({janus: 'trickle', candidate: event.candidate});
    } else {
      self.send({janus: 'trickle', candidate: {completed: true}});
      self._removePcEventListener('icecandidate');
    }
  });

  this._addPcEventListener('signalingstatechange', function() {
    if ('closed' == self._pc.signalingState) {
      self.closePeerConnection();
    }
  });

  this._addPcEventListener('iceconnectionstatechange', function() {
    switch (self._pc.iceConnectionState) {
      case 'closed':
      case 'failed':
        self.closePeerConnection();
        break;
    }
  });
};

MediaPlugin.prototype._addPcEventListener = function(event, listener) {
  this._pcListeners[event] = listener;
  this._pc.addEventListener(event, listener);
};

MediaPlugin.prototype._removePcEventListener = function(event) {
  this._pc.removeEventListener(event, this._pcListeners[event]);
  delete this._pcListeners[event];
};

module.exports = MediaPlugin;
