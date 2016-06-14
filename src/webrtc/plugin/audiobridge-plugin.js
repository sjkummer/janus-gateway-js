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
    var errorMessage = response['plugindata']['data']['error'];
    if (!errorMessage || errorMessage.indexOf('already exists') > 0) {
      return Promise.resolve(response['plugindata']['data']);
    }
    return Promise.reject(new Error(errorMessage));
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
 * @param {int} roomId
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @returns {Promise}
 */
AudiobridgePlugin.prototype.destroyRoom = function(roomId, options) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    var errorMessage = response['plugindata']['data']['error'];
    if (!errorMessage) {
      return Promise.resolve();
    }
    return Promise.reject(new Error(errorMessage));
  });
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      request: 'destroy',
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
    var errorMessage = response['plugindata']['data']['error'];
    if (!errorMessage) {
      return Promise.resolve(response['plugindata']['data']['list']);
    }
    return Promise.reject(new Error(errorMessage));
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
    var errorMessage = response['plugindata']['data']['error'];
    if (!errorMessage) {
      return Promise.resolve(response['plugindata']['data']['participants']);
    }
    return Promise.reject(new Error(errorMessage));
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
    var errorMessage = response['plugindata']['data']['error'];
    if (!errorMessage) {
      return Promise.resolve();
    }
    return Promise.reject(new Error(errorMessage));
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
AudiobridgePlugin.prototype.leaveRoom = function() {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    var errorMessage = response['plugindata']['data']['error'];
    if (!errorMessage) {
      return Promise.resolve();
    }
    return Promise.reject(new Error(errorMessage));
  });
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      request: 'leave'
    }
  };

  this.addTransaction(transaction);
  return this.sendSync(message);
};

/**
 * @typedef {Object} ConfigureOptions
 * @property {boolean} [muted]
 * @property {int} [quality]
 */

/**
 * @param {ConfigureOptions} options
 * @param {RTCSessionDescription} [jsep]
 * @returns {Promise}
 */
AudiobridgePlugin.prototype.configure = function(options, jsep) {
  var transactionId = Transaction.generateRandomId();
  var transaction = new Transaction(transactionId, function(response) {
    var errorMessage = response['plugindata']['data']['error'];
    if (!errorMessage) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(errorMessage));
  });
  var message = {
    janus: 'message',
    transaction: transactionId,
    body: {
      request: 'configure'
    }
  };
  Helpers.extend(message.body, options);
  if (jsep) {
    message.jsep = jsep;
  }

  this.addTransaction(transaction);
  return this.sendSync(message);
};

/**
 * @param {ConfigureOptions} configureOptions
 * @returns {Promise}
 */
AudiobridgePlugin.prototype.startOffer = function(configureOptions) {
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
      return self.sendOffer(jsep, configureOptions);
    });
};

/**
 * @param {RTCSessionDescription} jsep
 * @param {ConfigureOptions} configureOptions
 * @returns {Promise}
 */
AudiobridgePlugin.prototype.sendOffer = function(jsep, configureOptions) {
  return this.configure(configureOptions, jsep)
    .then(function(response) {
      var jsep = response['jsep'];
      if (jsep) {
        this.setRemoteSDP(jsep);
        return jsep;
      }
      return Promise.reject(new Error('Failed sendOffer'));
    }.bind(this));
};

module.exports = AudiobridgePlugin;
