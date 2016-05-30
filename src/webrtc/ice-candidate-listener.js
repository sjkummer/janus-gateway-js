var Helpers = require('../helpers');
var TEventEmitter = require('../traits/t-event-emitter');

/**
 * @param {RTCPeerConnection} pc
 * @constructor
 */
function IceCandidateListener(pc) {
  this._candidates = [];
  this._pc = pc;
  this._pc.onicecandidate = this.onIceCandidate.bind(this);
}

Helpers.extend(IceCandidateListener.prototype, TEventEmitter);

/**
 * @param {Object} event
 */
IceCandidateListener.prototype.onIceCandidate = function(event) {
  if (event.candidate) {
    var candidate = new IceCandidate(event.candidate);
    this.emit('candidate', candidate);
    this._candidates.push(candidate);
  } else {
    this.emit('complete', this._candidates);
    this._pc.onicecandidate = null;
  }
};

/**
 * @param {RTCIceCandidate} candidate
 * @constructor
 */
function IceCandidate(candidate) {
  this.candidate = candidate;
}

/**
 * @return {{candidate: *, sdpMid: *, sdpMLineIndex: *}}
 */
IceCandidate.prototype.toJSON = function() {
  return {
    candidate: this.candidate.candidate,
    sdpMid: this.candidate.sdpMid,
    sdpMLineIndex: this.candidate.sdpMLineIndex
  };
};

module.exports = IceCandidateListener;
