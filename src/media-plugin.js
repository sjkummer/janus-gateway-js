var Helpers = require('./helpers');
var Plugin = require('./plugin');

/**
 * @inheritDoc
 *
 * @constructor
 * @extends Plugin
 */
function MediaPlugin(session, name, id) {
  MediaPlugin.super_.apply(this, arguments);
}

Helpers.inherits(MediaPlugin, Plugin);

MediaPlugin.prototype.createOffer = function() {
  //need a cross-browser + node.js RTCPeerConnection. How?
};
