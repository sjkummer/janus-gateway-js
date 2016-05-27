var Promise = require('bluebird');
var Transaction = require('../../transaction');
var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaPlugin = require('../media-plugin');

function StreamingPlugin() {
  StreamingPlugin.super_.apply(this, arguments);
}

StreamingPlugin.NAME = 'janus.plugin.streaming';
Helpers.inherits(StreamingPlugin, MediaPlugin);
Plugin.register(StreamingPlugin.NAME, StreamingPlugin);

StreamingPlugin.prototype.list = function() {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    if ('success' == response['janus']) {
      return Promise.resolve(response['plugindata']['data']['list']);
    }
    return Promise.reject(new Error('Failed "list" request'));
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

/**
 * @param {string} streamId
 * @returns {Promise}
 */
StreamingPlugin.prototype.watch = function(streamId) {
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
StreamingPlugin.prototype.startStreaming = function(jsep) {
  var self = this;
  return Promise
    .try(function() {
      self.createPeerConnection();
    })
    .then(function() {
      return self.createAnswer(jsep);
    })
    .then(function(jsep) {
      return self.send({janus: 'message', body: {request: 'start'}, jsep: jsep});
    });

};

module.exports = StreamingPlugin;
