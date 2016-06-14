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

/**
 * @param {int} roomId
 * @param {Object} [options]
 * @param {boolean} [options.permanent]
 * @param {string} [options.description]
 * @param {string} [options.secret]
 * @param {string} [options.pin]
 * @param {boolean} [options.is_private]
 * @param {int} [options.sampling]
 * @param {boolean} [options.record]
 * @param {string} [options.record_file]
 * @returns {Promise}
 */
AudiobridgePlugin.prototype.createRoom = function(roomId, options) {
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
  Helpers.extend(message.body, options);

  this.addTransaction(transaction);
  return this.sendSync(message);
};

/**
 * @returns {Promise}
 */
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

/**
 * @param {int} roomId
 * @returns {Promise}
 */
AudiobridgePlugin.prototype.listParticipants = function(roomId) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    if ('success' == response['janus']) {
      return Promise.resolve(response['plugindata']['data']['participants']);
    }
    return Promise.reject(new Error('Failed list participants'));
  });
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      request: 'listparticipants',
      room: roomId
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

/**
 * @param {int} roomId
 * @param {Object} [options]
 * @param {int} [options.id]
 * @param {string} [options.pin]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {int} [options.quality]
 * @returns {Promise}
 */
AudiobridgePlugin.prototype.joinRoom = function(roomId, options) {
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
  Helpers.extend(message.body, options);

  this.addTransaction(transaction);
  return this.sendSync(message);
};

/**
 * @returns {Promise}
 */
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

/**
 * @param {RTCSessionDescription} jsep
 * @returns {Promise}
 */
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
