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
/*  VideocallPlugin.prototype.register = function(id, options, token) {
  if (this.hasCurrentEntity(id)) {
    return Promise.resolve(new JanusPluginMessage({}, this));
  }
  if (this.hasCurrentEntity()) {
    return this._change(id, options, token);
  }
  return this._join(id, options, token);
  // return this.send(id, options);

  // const body = { request: 'call', username: callId }
  // return this.transaction('message', { body, jsep }, 'event').catch(err => {
  //   this.logger.error('VideoCallPlugin cant call', err)
  //   throw err
  // })
}; */

// VideocallPlugin.prototype.call = async ({audio = false, video = true}, callbackSetup, partnerId) => {
//   var self = this;
//   console.log("get Tracks");
//   const stream = await this.getUserMedia({ audio: audio, video: video })
//   console.log("before create PC");
//   const setups = await callbackSetup(partnerId);
//   await this.createPC(stream)
//   console.log("before createOffer");
//   const jsep = self.createOffer();
//   console.log("after createOffer:", jsep);
//   var message_1 = { body: { audio: audio, video: video }, jsep: jsep };
//   console.log("before sendWithTransaction:", message_1);
//   const response = self.all;
//   var jsep_1 = response.get('jsep');
//   console.log("after sendWithTransaction:", response, jsep_1);
//   if (jsep_1) {
//     self.setRemoteSDP(jsep_1);
//     return jsep_1;
//   }
// };
VideocallPlugin.prototype.registerPlugin = function (message) {
  var self = this;
  return Promise.try(function () {
    return self.sendWithTransaction(message);
  }).then(function () {
    return Promise.resolve(self);
  });
};

VideocallPlugin.prototype.handleSendWithTransaction = function (options) {
  console.log("before handleSendWithTransaction", options);
  var self = this;
  return self.sendWithTransaction(options);
};

VideocallPlugin.prototype.receivedMessage = function (response) {
  var self = this;
  var jsep = response.get("jsep");
  console.log("after sendWithTransaction:", response, jsep);
  if (jsep) {
    self.setRemoteSDP(jsep);
    return jsep;
  }
};
/**
 - ["R.2.2"] Người nhận(Receiver) nhận được event "incomingcall" khi người gửi(sender) created offer
*/
VideocallPlugin.prototype.handleReceiverDidIncoming = function (jsep) {
  var self = this;
  if (jsep) {
    self.setRemoteSDP(jsep);
    return jsep;
  }
};

VideocallPlugin.prototype.handleOfferStream = function ({
  stream,
  offerOptions = {},
  configureOptions = {},
}) {
  var self = this;
  console.log("before offerStream", stream, offerOptions, configureOptions);
  return self.offerStream(stream, offerOptions, configureOptions);
};

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

/*  VideocallPlugin.prototype.register = function(id, options, token) {
  if (this.hasCurrentEntity(id)) {
    return Promise.resolve(new JanusPluginMessage({}, this));
  }
  if (this.hasCurrentEntity()) {
    return this._change(id, options, token);
  }
  return this._join(id, options, token);
  // return this.send(id, options);

  // const body = { request: 'call', username: callId }
  // return this.transaction('message', { body, jsep }, 'event').catch(err => {
  //   this.logger.error('VideoCallPlugin cant call', err)
  //   throw err
  // })
}; */

// VideocallPlugin.prototype.call = async ({audio = false, video = true}, callbackSetup, partnerId) => {
//   var self = this;
//   console.log("get Tracks");
//   const stream = await this.getUserMedia({ audio: audio, video: video })
//   console.log("before create PC");
//   const setups = await callbackSetup(partnerId);
//   await this.createPC(stream)
//   console.log("before createOffer");
//   const jsep = self.createOffer();
//   console.log("after createOffer:", jsep);
//   var message_1 = { body: { audio: audio, video: video }, jsep: jsep };
//   console.log("before sendWithTransaction:", message_1);
//   const response = self.all;
//   var jsep_1 = response.get('jsep');
//   console.log("after sendWithTransaction:", response, jsep_1);
//   if (jsep_1) {
//     self.setRemoteSDP(jsep_1);
//     return jsep_1;
//   }
// };

VideocallPlugin.prototype.call = function (options) {
  var self = this;
  return Promise.try(function () {
    console.log("getUserMedia");
    return self.getUserMedia({ audio: true, video: true });
  })
    .then(function (stream) {
      console.log("before create PC", stream);
      self.createPeerConnection({ config: options.iceServers });
      stream.getTracks().forEach(function (track) {
        self.addTrack(track, stream);
      });
    })
    .then(function () {
      console.log("before createOffer");
      return self.createOffer();
    })
    .then(function (jsep) {
      var message = {
        body: options.body,
        request: "offer",
        jsep: jsep,
        handle_id: options.body.handle_id,
        session_id: options.body.session_id,
        //
        // body: {
        //   request: 'register',
        //   // sender: `${userId}`,
        //   username: `${userId}`,
        //   // username: username,
        //   // target: `${partnerId}`,
        //   token: token,
        //   sid: `${callerSessionId}`,
        //   //audio: true,
        //   //video: true,
        // },
      };
      console.log("after createOffer:", jsep, options, message);
      console.log("before sendWithTransaction:", message);
      return self.sendWithTransaction(message);
    });
  // .then(function(response) {
  //   var jsep = response.get('jsep');
  //   console.log("after sendWithTransaction:", response, jsep);
  //   if (jsep) {
  //     self.setRemoteSDP(jsep);
  //     console.log('check connection', self)
  //     return jsep;
  //   }
  // });
};

/**

 - ["R.2.2"] Người nhận(Receiver) nhận được event "incomingcall" khi người gửi(sender) created offer
*/
VideocallPlugin.prototype.handleSetRemoteSDP = function (jsep) {
  var self = this;
  if (jsep) {
    console.log("VideocallPlugin handleSetRemoteSDP", jsep);
    self.setRemoteSDP(jsep);
    return jsep;
  }
};
VideocallPlugin.prototype.handleCreatePeerConnection = function (options) {
  var self = this;
  console.log("before create PC", options);
  return self
    .handleGetUserMedia2({ audio: true, video: true })
    .then(function (stream) {
      self.createPeerConnection(options);
      stream.getTracks().forEach(function (track) {
        self.addTrack(track, stream);
      });
      console.log("after createPeerConnection:", stream, this, self);
      return Promise.resolve({
        pc: self.getPeerConnection(),
        stream,
        options
      });
    });
};

VideocallPlugin.prototype.handleGetUserMedia2 = function ({
  audio = true,
  video = true,
}) {
  var self = this;
  console.log("this", this);
  return Promise.try(function () {
    console.log("before getUserMedia");
    console.log("self", self);
    return self.getUserMedia({ audio: audio, video: video });
  });
};
VideocallPlugin.prototype.handleGetUserMedia1 = function ({
  audio = true,
  video = true,
}) {
  var self = this;
  console.log("this", this);
  return new Promise(function (resolve, reject) {
    console.log("before getUserMedia");
    console.log("self", self);
    resolve(self.getUserMedia({ audio: audio, video: video }));
  });
};

VideocallPlugin.prototype.handleCreateOffer = function (options) {
  var self = this;
  return Promise.try(function () {
    console.log("before createOffer");
    return self.createOffer();
  }).then(function (jsep) {
    var message = {
      body: options.body,
      request: "call",
      jsep: jsep,
      handle_id: options.body.handle_id,
      session_id: options.body.session_id,
      //
      // body: {
      //   request: 'register',
      //   // sender: `${userId}`,
      //   username: `${userId}`,
      //   // username: username,
      //   // target: `${partnerId}`,
      //   token: token,
      //   sid: `${callerSessionId}`,
      //   //audio: true,
      //   //video: true,
      // },
    };
    console.log("after createOffer:", jsep, options, message);
    console.log("before sendWithTransaction:", message);
    return self.sendWithTransaction(message);
  });
};

VideocallPlugin.prototype.requestCall = function (sdp) {
  var self = this;
  console.log("registerPlugin", message);
  let message = {
    body: {
      request: "register",
      // sender: `${userId}`,
      username: `${userId}`,
      // username: username,
      // target: `${partnerId}`,
      token: token,
      sid: `${callerSessionId}`,
      //audio: true,
      //video: true,
    },
    handle_id: callerPlugin.getId(),
    session_id: callerSessionId,
  };
  return self.sendWithTransaction(message);
};

VideocallPlugin.prototype.handleCreateAnswer = function (res, answerOptions) {
  var self = this;
  return Promise.try(function () {
    return self.createAnswer(res.jsep);
  }).then(function (jsep) {
    var message = {
      body: res.body,
      request: "accept",
      jsep,
      handle_id: res.handle_id,
      session_id: res.session_id,
    };
    return self.sendWithTransaction(message);
  });
};

VideocallPlugin.prototype.handleRequestHangup = function (message) {
  console.log("before handleRequestHangup", message);
  var self = this;
  return Promise.try(function () {
    return self.sendWithTransaction(message);
  }).then(function (res) {
    console.log("after handleRequestHangup", res);
    return Promise
      .try(function() {
        return self.getUserMedia({audio: true, video: false});
      })
      .then(function(stream) {
        self.closePeerConnection();
        stream.getTracks().forEach(function(track) {
          track.stop()
        });
        self.detach()
        return Promise.resolve(res);
      })
  });
};

module.exports = VideocallPlugin;
