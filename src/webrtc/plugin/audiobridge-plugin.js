var PluginCreate = Janus.Plugin.create;
Janus.Plugin.create = function(session, name, id) {
  if (AudiobridgePlugin.NAME == name) {
    return new AudiobridgePlugin(session, name, id);
  }
  return PluginCreate(session, name, id);
};

function AudiobridgePlugin() {
  Janus.MediaPlugin.apply(this, arguments);
}

AudiobridgePlugin.NAME = 'janus.plugin.audiobridge';

AudiobridgePlugin.prototype = Object.create(Janus.MediaPlugin.prototype);
AudiobridgePlugin.prototype.constructor = AudiobridgePlugin;

AudiobridgePlugin.prototype.createRoom = function(roomId) {
  var transactionId = Janus.Transaction.generateRandomId();
  var transaction = new Janus.Transaction(transactionId, function(response) {
    if ('success' == response['janus']) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error('Failed room create'));
  });
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      request: 'create',
      room: roomId
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

AudiobridgePlugin.prototype.listRooms = function() {
  var transactionId = Janus.Transaction.generateRandomId();
  var transaction = new Janus.Transaction(transactionId, function(response) {
    if ('success' == response['janus']) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error('Failed list rooms'));
  });
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      request: 'list'
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

AudiobridgePlugin.prototype.joinRoom = function(roomId) {
  var transactionId = Janus.Transaction.generateRandomId();
  var transaction = new Janus.Transaction(transactionId, function(response) {
    if ('error' != response['janus'] && !response['plugindata']['data']['error']) {
      return this.onJoined();
    }
    return Promise.reject(new Error('Failed room join'));
  }.bind(this));
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      request: 'join',
      room: roomId
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

AudiobridgePlugin.prototype.onJoined = function() {
  var self = this;
  return Promise
    .try(function() {
      return self.getLocalMedia({audio: true, video: false});
    })
    .then(function(stream) {
      self.createPeerConnection();
      self.addStream(stream);
    })
    .then(function() {
      return self.createOffer();
    }).then(function(jsep) {
      var transactionId = Janus.Transaction.generateRandomId();
      var transaction = new Janus.Transaction(transactionId, function(response) {
        if (response['jsep']) {
          return self.setRemoteSDP(response['jsep']);
        }
        return Promise.reject(new Error('Failed createAnswer'));
      });

      self.addTransaction(transaction);
      var message = {janus: 'message', body: {request: 'configure', muted: false}, jsep: jsep, transaction: transactionId};
      self.send(message);
    });

};
