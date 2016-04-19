var webrtcsupport = require('webrtcsupport');
var Helpers = require('../helpers');
var Plugin = require('../plugin');

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

MediaPlugin.prototype.createOffer = function() {
};

MediaPlugin.prototype.createAnswer = function() {
};

MediaPlugin.prototype._createPeerConnection = function() {
  var options = this._session._connection._options.pc;
  var config = {
    iceServers: [{url: 'stun:stun.l.google.com:19302'}]
  };
  var constraints = {
    'optional': [{'DtlsSrtpKeyAgreement': true}]
  };

  if (options) {
    if (options.config) {
      Helpers.extend(config, options.config);
    }
    if (options.constraints) {
      Helpers.extend(constraints, options.constraints);
    }
  }

  return new webrtcsupport.PeerConnection(config, constraints);
  //var pc = new webrtcsupport.PeerConnection(config, constraints);
  //pc.onicecandidate = iceCallback;
};
