var Promise = require('bluebird');
var Helpers = require('../helpers');
var MediaEntityPlugin = require('./media-entity-plugin');

function MediaStreamPlugin() {
  MediaStreamPlugin.super_.apply(this, arguments);

  /** @type {string|number} */
  this._currentMountpointId = null;
}

Helpers.inherits(MediaStreamPlugin, MediaEntityPlugin);

/**
 * @param {string|number} id
 * @param {Object} options
 * @return {Promise}
 */
MediaStreamPlugin.prototype._create = function(id, options) {
  options = Helpers.extend({id: id}, options);
  return MediaStreamPlugin.super_.prototype._create.call(this, options)
    .then(function() {
      if (id == this._currentMountpointId) {
        this._currentMountpointId = null;
      }
    }.bind(this));
};

/**
 * @param {string|number} id
 * @param {Object} options
 * @return {Promise}
 */
MediaStreamPlugin.prototype._destroy = function(id, options) {
  options = Helpers.extend({id: id}, options);
  return MediaStreamPlugin.super_.prototype._destroy.call(this, options)
    .then(function() {
      if (id == this._currentMountpointId) {
        this._currentMountpointId = null;
      }
    }.bind(this));
};

/**
 * @param {string|number} id
 * @param {Object} [watchOptions]
 * @param {Object} [answerOptions]
 * @return {Promise}
 */
MediaStreamPlugin.prototype._watch = function(id, watchOptions, answerOptions) {
  var plugin = this;
  var body = Helpers.extend({request: 'watch', id: id}, watchOptions);
  return this.sendWithTransaction({body: body})
    .then(function(response) {
      var jsep = response['jsep'];
      if (!jsep || 'offer' != jsep['type']) {
        throw new Error('Expect offer response on watch request')
      }
      plugin._currentMountpointId = id;
      return plugin._startMediaStreaming(jsep, answerOptions);
    });
};

/**
 * @param {RTCSessionDescription} [jsep]
 * @return {Promise}
 */
MediaStreamPlugin.prototype._start = function(jsep) {
  var message = {body: {request: 'start'}};
  if (jsep) {
    message.jsep = jsep;
  }
  return this.sendWithTransaction(message);
};

/**
 * @return {Promise}
 */
MediaStreamPlugin.prototype._stop = function() {
  return this.sendWithTransaction({body: {request: 'stop'}})
    .then(function() {
      this._currentMountpointId = null;
    }.bind(this));
};

/**
 * @return {Promise}
 */
MediaStreamPlugin.prototype._pause = function() {
  return this.sendWithTransaction({body: {request: 'pause'}});
};

/**
 * @param {string|number} id
 * @param {Object} [options]
 * @return {Promise}
 */
MediaStreamPlugin.prototype._switch = function(id, options) {
  var body = Helpers.extend({
    request: 'switch',
    id: id
  }, options);
  return this.sendWithTransaction({body: body})
    .then(function() {
      this._currentMountpointId = id;
    }.bind(this));
};

/**
 * @param {string|number} id
 * @param {Object} [watchOptions]
 * @param {Object} [answerOptions]
 * @return {Promise}
 */
MediaStreamPlugin.prototype.connect = function(id, watchOptions, answerOptions) {
  if (id == this._currentMountpointId) {
    return Promise.resolve();
  }
  if (this._currentMountpointId) {
    return this._switch(id, watchOptions);
  }
  return this._watch(id, watchOptions, answerOptions);
};

/**
 * @param {RTCSessionDescription} jsep
 * @param {RTCAnswerOptions} [answerOptions]
 * @return {Promise}
 */
MediaStreamPlugin.prototype._startMediaStreaming = function(jsep, answerOptions) {
  var self = this;
  return Promise
    .try(function() {
      self.createPeerConnection();
    })
    .then(function() {
      return self.createAnswer(jsep, answerOptions);
    })
    .then(function(jsep) {
      return self.send({janus: 'message', body: {request: 'start'}, jsep: jsep});
    });
};

module.exports = MediaStreamPlugin;
