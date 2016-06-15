var Helpers = require('../helpers');
var TEventEmitter = require('../traits/t-event-emitter');

function IceCandidateListener(pc) {
  this._candidates = [];
  this._pc = pc;
  this._pc.onicecandidate = this.onIceCandidate.bind(this);
}

Helpers.extend(IceCandidateListener.prototype, TEventEmitter);

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

function IceCandidate(candidate) {
  this.candidate = candidate;
}

IceCandidate.prototype.toJSON = function() {
  return {
    candidate: this.candidate.candidate,
    sdpMid: this.candidate.sdpMid,
    sdpMLineIndex: this.candidate.sdpMLineIndex
  };
};

module.exports = IceCandidateListener;
