var util = require('util');
var EventEmitter = require('events');

function IceCandidateListener(pc) {
  this._candidates = [];
  this._pc = pc;
  this._pc.onicecandidate = this.onIceCandidate.bind(this);
}

util.inherits(IceCandidateListener, EventEmitter);

IceCandidateListener.prototype.onIceCandidate = function(event) {
  if (event.candidate) {
    var candidate = new IceCandidate(event.candidate.candidate);
    this.emit('candidate', candidate);
    this._candidates.push(candidate);
  } else {
    this.emit('complete', this._candidates);
    this._pc.onicecandidate = null;
    this._pc.close();
  }
};

function IceCandidate(text) {
  this._text = text;
  var candidateStr = 'candidate:';
  var pos = text.indexOf(candidateStr) + candidateStr.length;
  var fields = text.substr(pos).split(' ');

  this.foundation = fields[0];
  this.component = fields[1];
  this.protocol = fields[2];
  this.priority = fields[3];
  this.address = fields[4];
  this.port = fields[5];
  this.type = fields[7];
}

IceCandidate.prototype.toString = function() {
  return this._text;
};

module.exports = IceCandidateListener;
