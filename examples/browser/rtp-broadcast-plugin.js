function RtpBroadcastPlugin() {
  Janus.MediaPlugin.apply(this, arguments);
}

RtpBroadcastPlugin.NAME = 'janus.plugin.cm.rtpbroadcast';

RtpBroadcastPlugin.prototype = Object.create(Janus.MediaPlugin.prototype);
RtpBroadcastPlugin.prototype.constructor = RtpBroadcastPlugin;

RtpBroadcastPlugin.prototype.createStream = function(streamId, streamChannelType, streams) {
  var transactionId = Janus.Transaction.generateRandomId();
  var transaction = new Janus.Transaction(transactionId, function(response) {
    if ('success' == response['janus']) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('Failed stream create'));
  });
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      request: 'create',
      id: streamId,
      name: streamId,
      description: streamId,
      recorded: true,
      streams: streams,
      channel_data: "{\"streamChannelType\": " + streamChannelType + "}"
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

RtpBroadcastPlugin.prototype.watch = function(streamId, streamChannelType) {
  var transactionId = Janus.Transaction.generateRandomId();
  var transaction = new Janus.Transaction(transactionId, function(response) {
    if (!response['jsep'] || 'offer' != response['jsep']['type']) {
      return Promise.reject(new Error('Expect createOffer response on watch request'));
    }
    return this.receiveOffer(response);
  }.bind(this));
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      id: streamId,
      channel_data: {streamChannelType: streamChannelType},//TODO be careful here. Might need to be JSON.stringify
      request: 'watch'
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

RtpBroadcastPlugin.prototype.receiveOffer = function(message) {
  throw new Error('Implement `receiveOffer` of RtpBroadcastPlugin');
};
