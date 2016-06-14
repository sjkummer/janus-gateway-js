var Promise = require('bluebird');
var Transaction = require('../../transaction');
var Helpers = require('../../helpers');
var Plugin = require('../../plugin');
var MediaPlugin = require('../media-plugin');

function AudiobridgePlugin() {
  AudiobridgePlugin.super_.apply(this, arguments);
}

AudiobridgePlugin.NAME = 'janus.plugin.audiobridge';
Helpers.inherits(AudiobridgePlugin, MediaPlugin);
Plugin.register(AudiobridgePlugin.NAME, AudiobridgePlugin);

AudiobridgePlugin.prototype.createRoom = function(roomId) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    if ('success' == response['janus']) {
      return Promise.resolve(response['plugindata']['data']);
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
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    if ('success' == response['janus']) {
      return Promise.resolve(response['plugindata']['data']['list']);
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
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    if ('error' == response['janus'] || response['plugindata']['data']['error']) {
      return Promise.reject(new Error('Failed room join'));
    }
    return Promise.resolve();
  });
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

AudiobridgePlugin.prototype.startOffer = function() {
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
    })
    .then(function(jsep) {
      return self.sendOffer(jsep);
    });
};

AudiobridgePlugin.prototype.sendOffer = function(jsep) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    var jsep = response['jsep'];
    if (jsep) {
      this.setRemoteSDP(jsep);
      return jsep;
    }
    return Promise.reject(new Error('Failed sendOffer'));
  }.bind(this));
  var message = {
    janus: 'message',
    transaction: transactionId,
    jsep: jsep,
    body: {
      request: 'configure', muted: false
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

module.exports = AudiobridgePlugin;
