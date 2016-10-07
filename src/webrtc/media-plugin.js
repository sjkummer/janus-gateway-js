var Promise = require('bluebird');
var webrtcsupport = require('webrtcsupport');
var Helpers = require('../helpers');
var Plugin = require('../plugin');
var MediaDevicesShim = require('./media-devices-shim');

/**
 * @inheritDoc
 *
 * IMPORTANT! WebRTC stuff will not work in node environment.
 * @constructor
 * @extends Plugin
 */
function MediaPlugin(session, name, id) {
  MediaPlugin.super_.apply(this, arguments);

  this._pcListeners = {};
  this._pc = null;
}

Helpers.inherits(MediaPlugin, Plugin);

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#RTCConfiguration_dictionary
 * @typedef {Object} RTCConfiguration
 */

/**
 * @param {RTCConfiguration} [options]
 * @returns {RTCPeerConnection}
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
 * @returns {RTCPeerConnection|null}
 */
MediaPlugin.prototype.getPeerConnection = function() {
  return this._pc;
};

/**
 * @returns {Promise}
 */
MediaPlugin.prototype.hangup = function() {
  return new Promise(function(resolve, reject) {
    this.once('hangup', resolve);
    this.sendWithTransaction({janus: 'hangup'}).catch(reject);
  }.bind(this));
};

/**
 * @see https://www.w3.org/TR/mediacapture-streams/#mediastreamtrack
 * @typedef {Object} MediaStreamTrack
 */

/**
 * @param {MediaStreamTrack} track
 * @param {...MediaStream} [stream]
 */
MediaPlugin.prototype.addTrack = function(track, stream) {
  if (!this._pc.addTrack) {
    //TODO remove this part as soon as pc.addTrack is supported by chrome or webrtc/adapter#361 is implemented
    if (!stream) {
      throw new Error('MediaPlugin.addTrack. Missing stream argument when pc.addTrack is not supported');
    }
    this._pc.addStream(stream);
    this.emit('pc:track:local', {streams: [stream]});
  } else {
    this._pc.addTrack.apply(this._pc, arguments);
    this.emit('pc:track:local', {track: track, streams: Array.prototype.slice.call(arguments, 1)});
  }
};

/**
 * @param {MediaStreamConstraints} constraints
 * @returns {Promise}
 * @fulfilled {MediaStream} stream
 */
MediaPlugin.prototype.getUserMedia = function(constraints) {
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
 * @returns {Promise}
 * @fulfilled {@link _createSDP}
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
 * @returns {Promise}
 * @fulfilled {@link _createSDP}
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
 * @returns {Promise}
 */
MediaPlugin.prototype.setRemoteSDP = function(jsep) {
  return this._pc.setRemoteDescription(new webrtcsupport.SessionDescription(jsep));
};

/**
 * @param {string} party
 * @param {RTCAnswerOptions|RTCOfferOptions} [options]
 * @returns {Promise}
 * @fulfilled {RTCSessionDescription} sdp
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
      var janusType = message['janus'];
      switch (janusType) {
        case 'trickle':
          self._onTrickle(message);
          break;
        case 'hangup':
          self._onHangup(message);
          break;
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
    this.emit('pc:error', error);
  }.bind(this));
};

/**
 * @param {Object} incomeMessage
 */
MediaPlugin.prototype._onHangup = function(incomeMessage) {
  this.emit('hangup', incomeMessage);
};

MediaPlugin.prototype.closePeerConnection = function() {
  if (this._pc) {
    this._stopLocalMedia();
    Object.keys(this._pcListeners)
      .forEach(function(event) {
        this._removePcEventListener(event);
      }.bind(this));
    this._pc.close();
    this._pc = null;
    this.emit('pc:close');
  }
};

MediaPlugin.prototype._stopLocalMedia = function() {
  var streams = this._pc.getLocalStreams();
  streams.forEach(function(stream) {
    if (stream.stop) {
      stream.stop();
    } else if (stream.getTracks) {
      stream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
  });
};

MediaPlugin.prototype._detach = function(message) {
  this.closePeerConnection();
  return MediaPlugin.super_.prototype._detach.apply(this, arguments);
};

MediaPlugin.prototype._addPcEventListeners = function() {
  var self = this;

  this._addPcEventListener('addstream', function(event) {
    self.emit('pc:track:remote', {streams: [event.stream]});
  });
  this._addPcEventListener('track', function(event) {
    self.emit('pc:track:remote', event);
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
