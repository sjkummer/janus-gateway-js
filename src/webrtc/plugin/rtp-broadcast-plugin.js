var Promise = require('bluebird');
var Transaction = require('../../transaction');
var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaPlugin = require('../media-plugin');

function RtpBroadcastPlugin() {
  RtpBroadcastPlugin.super_.apply(this, arguments);
}

RtpBroadcastPlugin.NAME = 'janus.plugin.cm.rtpbroadcast';
Helpers.inherits(RtpBroadcastPlugin, MediaPlugin);
Plugin.register(RtpBroadcastPlugin.NAME, RtpBroadcastPlugin);

/**
 * @param {string} streamId
 * @param {string} streamChannelType
 * @param {Array} streams
 * @returns {*|Promise}
 */
RtpBroadcastPlugin.prototype.createStream = function(streamId, streamChannelType, streams) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
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

/**
 * @param {string} streamId
 * @param {string} streamChannelType
 * @returns {Promise}
 */
RtpBroadcastPlugin.prototype.watch = function(streamId, streamChannelType) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    if (!response['jsep'] || 'offer' != response['jsep']['type']) {
      return Promise.reject(new Error('Expect createOffer response on watch request'));
    }
    return response['jsep'];
  }.bind(this));
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      id: streamId,
      channel_data: {streamChannelType: streamChannelType},
      request: 'watch'
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

/**
 * @param {Object} jsep
 * @returns {Promise}
 */
RtpBroadcastPlugin.prototype.publish = function(jsep) {
  var self = this;
  return Promise
    .try(function() {
      return self.getLocalMedia({audio: false, video: true});
    })
    .then(function(stream) {
      return self.startAnswer(stream, jsep);
    });

};

/**
 * @param {Object} jsep
 * @returns {Promise}
 */
RtpBroadcastPlugin.prototype.subcribe = function(jsep) {
  var self = this;
  return Promise
    .try(function() {
      return self.getLocalMedia({audio: false, video: false});
    })
    .then(function(stream) {
      return self.startAnswer(stream, jsep);
    })
};

/**
 * @param {Object} jsep
 * @param {MediaStream} stream
 * @returns {*}
 */
RtpBroadcastPlugin.prototype.startAnswer = function(jsep, stream) {
  var self = this;
  return Promise
    .try(function() {
      self.createPeerConnection();
      self.addStream(stream);
    })
    .then(function() {
      return self.createAnswer(jsep);
    }).then(function(jsep) {
      return self.send({janus: 'message', body: {request: 'start'}, jsep: jsep});
    });

};

module.exports = RtpBroadcastPlugin;
