var Promise = require("bluebird");
var Helpers = require("../../helpers");
var Plugin = require("../../plugin");
var MediaVideoPlugin = require("../media-video-plugin");

function VideocallPlugin() {
  VideocallPlugin.super_.apply(this, arguments);
}

VideocallPlugin.NAME = "janus.plugin.videocall";
Helpers.inherits(VideocallPlugin, MediaVideoPlugin);
Plugin.register(VideocallPlugin.NAME, VideocallPlugin);

/**
 * @param {string} id
 * @param {Object} [options]
 * @param {string} [options.secret]
 * @param {boolean} [options.permanent]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.destroy = function (id, options) {
  return this._destroy(id, Helpers.extend({ id: id }, options));
};

/**
 * @param {string} id
 * @param {Object} [options]
 * @param {number} [options.userid]
 * @param {string} [options.display]
 * @param {boolean} [options.muted]
 * @param {number} [options.quality]
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.join = function (id, options) {
  options = Helpers.extend({ id: id }, options);
  return this._join(id, options);
};

/**
 * @param {string} id
 * @param {Object} [options] {@link join}
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.change = function (id, options) {
  options = Helpers.extend({ id: id }, options);
  return this._change(id, options);
};

/**
 * @param {string} id
 * @param {Object} [options] {@link join}
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.connect = function (id, options) {
  options = Helpers.extend({ id: id }, options);
  return this._connect(id, options);
};

/**
 * @param {string} id
 * @returns {Promise}
 * @fulfilled {Array} list
 */
VideocallPlugin.prototype.listParticipants = function (id) {
  return this._listParticipants({ id: id });
};

// VideocallPlugin.prototype.onlineList = function () {
// onlineList () {
//   const body = { request: 'list' }
//   return this.transaction('message', { body }, 'event').then(data => {
//     if (data.result && data.result.list) {
//       return data.result.list
//     }
//     return []
//   })
// }
// }

/**
 * @inheritDoc
 */
VideocallPlugin.prototype.getResponseAlias = function () {
  return "videocall";
};

/**
 * @param {Object} [jsep]
 * @param {string|number} callId
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.doCall = function (id, options) {
  if (this.hasCurrentEntity(id)) {
    return Promise.resolve(new JanusPluginMessage({}, this));
  }
  if (this.hasCurrentEntity()) {
    return this._change(id, options);
  }
  return this._join(id, options);
  // const body = { request: 'call', username: callId }
  // return this.transaction('message', { body, jsep }, 'event').catch(err => {
  //   this.logger.error('VideoCallPlugin cant call', err)
  //   throw err
  // })
};

/**
 * @param {string} id
 * @param {Object} options
 * @returns {Promise}
 * @fulfilled {JanusPluginMessage} response
 */
VideocallPlugin.prototype.register = function (id, options) {
  if (this.hasCurrentEntity(id)) {
    return Promise.resolve(new JanusPluginMessage({}, this));
  }
  if (this.hasCurrentEntity()) {
    return this._change(id, options);
  }
  return this._join(id, options);

  // const body = { request: 'call', username: callId }
  // return this.transaction('message', { body, jsep }, 'event').catch(err => {
  //   this.logger.error('VideoCallPlugin cant call', err)
  //   throw err
  // })
};

VideocallPlugin.prototype.test = function (state) {
  var self = this;
  return Promise.try(() => {
    console.log("get Tracks");
    return self.getUserMedia({ audio: false, video: true });
  })
    .then((stream) => {
      console.log("before create PC");
      self.createPeerConnection();
      console.log("after createPeerConnection:", stream, this, self);
      stream.getTracks().forEach(function (track) {
        console.log("after getTracks:", track);
        self.addTrack(track, stream);
      });
    })
    .then(function () {
      console.log("before createOffer");
      return self.createOffer();
    })
    .then(function (jsep) {
      console.log("after createOffer:", jsep);
      var message = { body: { audio: state }, jsep: jsep };
      console.log("before sendWithTransaction:", message);

      return self.all;
    })
    .then(function (response) {
      var jsep = response.get("jsep");
      console.log("after sendWithTransaction:", response, jsep);
      if (jsep) {
        self.setRemoteSDP(jsep);
        return jsep;
      }
    });
};

module.exports = VideocallPlugin;
