var PluginCreate = Janus.Plugin.create;
Janus.Plugin.create = function(session, name, id) {
  if (RtpBroadcastPlugin.NAME == name) {
    return new RtpBroadcastPublish(session, name, id);
  }
  return PluginCreate(session, name, id);
};

function RtpBroadcastPublish() {
  RtpBroadcastPlugin.apply(this, arguments);
}

RtpBroadcastPublish.prototype = Object.create(RtpBroadcastPlugin.prototype);
RtpBroadcastPublish.prototype.constructor = RtpBroadcastPublish;

RtpBroadcastPublish.prototype.receiveOffer = function(message) {
  var self = this;
  return Promise
    .try(function() {
      return self.getLocalMedia({audio: false, video: true});
    })
    .then(function(stream) {
      self.createPeerConnection();
      self.addStream(stream);
    })
    .then(function() {
      self.createAnswer(message['jsep']);
    });
};
