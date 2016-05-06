var Promise = require('bluebird');
var webrtcsupport = require('webrtcsupport');
var Helpers = require('../helpers');
var Plugin = require('../plugin');

/**
 * @inheritDoc
 *
 * @constructor
 * @extends Plugin
 */
function MediaPlugin(session, name, id) {
  if (!webrtcsupport.support) {
    throw new Error('WebRTC is not supported');
  }
  MediaPlugin.super_.apply(this, arguments);
}

Helpers.inherits(MediaPlugin, Plugin);

/**
 * @param {Object} params
 * @param {Object} params.media
 * @param {Object} params.media.local Media constraints for local stream
 * @param {Object} params.media.remote Media constraints for remote stream
 */
MediaPlugin.prototype.createOffer = function(params) {
};

MediaPlugin.prototype.createAnswer = function() {
};

MediaPlugin.prototype._createPeerConnection = function() {
  var options = this._session._connection._options.pc;
  var config = {
    iceServers: [{url: 'stun:stun.l.google.com:19302'}]
  };
  var constraints = {
    'optional': [{'DtlsSrtpKeyAgreement': true}]
  };

  if (options) {
    if (options.config) {
      Helpers.extend(config, options.config);
    }
    if (options.constraints) {
      Helpers.extend(constraints, options.constraints);
    }
  }

  return new webrtcsupport.PeerConnection(config, constraints);
  //var pc = new webrtcsupport.PeerConnection(config, constraints);
  //pc.onicecandidate = iceCallback;
};

/**
 * @param {Object} constraints https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Parameters
 * @return {Promise}
 */
MediaPlugin.prototype.getLocalMedia = function(constraints) {
  this.emit('consent-dialog:start');
  var promise;
  if (constraints.video === 'screen') {
    promise = this._getSharedScreen({audio: constraints.audio});
  } else {
    promise = window.getUserMedia(constraints);
  }
  var self = this;
  return promise
    .then(function(stream) {
      self.emit('consent-dialog:stop', {stream: stream});
      return stream;
    })
    .catch(function(error) {
      self.emit('consent-dialog:stop', {error: error});
      throw error;
    })
    .finally(function() {
      if (promise.isCancelled()) {
        self.emit('consent-dialog:stop');
      }
    });
};

MediaPlugin.prototype._getSharedScreen = function(constraints) {
  if (window.location.protocol !== 'https:') {
    return Promise.reject(new Error('Screen sharing only works on HTTPS, try the https:// version of this page'));
  }

  if (window.navigator.userAgent.match('Chrome')) {
    return this._getSharedScreenChrome(constraints);
  } else if (window.navigator.userAgent.match('Firefox')) {
    return this._getSharedScreenFirefox(constraints);
  }
};

MediaPlugin.prototype._getSharedScreenChrome = function(constraints) {
  var chromever = parseInt(window.navigator.userAgent.match(/Chrome\/(.*) /)[1], 10);
  var maxver = 33;
  if (window.navigator.userAgent.match('Linux')) {
    maxver = 35;
  }	// "known" crash in chrome 34 and 35 on linux
  if (chromever >= 26 && chromever <= maxver) {
    // Chrome 26->33 requires some awkward chrome://flags manipulation
    constraints = Helpers.extend({}, constraints, {
      video: {
        mandatory: {
          googLeakyBucket: true,
          maxWidth: window.screen.width,
          maxHeight: window.screen.height,
          maxFrameRate: 3,
          chromeMediaSource: 'screen'
        }
      }
    });
    return window.getUserMedia(constraints);
  } else {
    // Chrome 34+ requires an extension
    return new Promise(function(resolve, reject) {
      var timeoutRejectId;
      var messageListener = function(event) {
        if (event.origin != window.location.origin) {
          return;
        }
        if (event.data.type == 'janusGotScreen' && timeoutRejectId == event.data.id) {
          window.clearTimeout(timeoutRejectId);
          window.removeEventListener('message', messageListener);

          if (event.data.sourceId === '') {
            // user canceled
            var error = new Error('NavigatorUserMediaError');
            error.name = 'You cancelled the request for permission, giving up...';
            reject(error);
          } else {
            constraints = Helpers.extend({}, constraints, {
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  maxWidth: window.screen.width,
                  maxHeight: window.screen.height,
                  maxFrameRate: 3
                },
                optional: [
                  {googLeakyBucket: true},
                  {googTemporalLayeredScreencast: true}
                ]
              }
            });
            constraints.video.mandatory.chromeMediaSourceId = event.data.sourceId;
            resolve(window.getUserMedia(constraints));
          }
        } else if (event.data.type == 'janusGetScreenPending') {
          if (timeoutRejectId == event.data.id) {
            window.clearTimeout(timeoutRejectId);
          }
        }
      };

      window.addEventListener('message', messageListener);
      timeoutRejectId = setTimeout(
        function() {
          window.removeEventListener('message', messageListener);
          var error = new Error('NavigatorUserMediaError');
          error.name = 'The required Chrome extension is not installed: click <a href="#">here</a> to install it. (NOTE: this will need you to refresh the page)';
          reject(error);
        }, 1000);
      window.postMessage({type: 'janusGetScreen', id: timeoutRejectId}, '*');
    });
  }
};

MediaPlugin.prototype._getSharedScreenFirefox = function(constraints) {
  //TODO use UserAgent lib for version/OS/browser detection
  var ffver = parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10);
  if (ffver >= 33) {
    constraints = Helpers.extend({}, constraints, {
      video: {
        mozMediaSource: 'window',
        mediaSource: 'window'
      }
    });
    return window.getUserMedia(constraints).then(function(stream) {
      if (stream) {
        // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1045810
        var lastStreamTime = stream.currentTime;
        var inderval = window.setInterval(function() {
          if (stream.currentTime == lastStreamTime) {
            window.clearInterval(inderval);
            if (stream.onended) {
              stream.onended();
            }
          }
          lastStreamTime = stream.currentTime;
        }, 500);
      }
      return stream;
    });
  } else {
    //var error = new Error('NavigatorUserMediaError');
    //error.name = 'Your version of Firefox does not support screen sharing, please install Firefox 33 (or more recent versions)';
    var error = new Error('Your version of Firefox does not support screen sharing, please install Firefox 33 (or more recent versions)');
    return Promise.reject(error);
  }
};
