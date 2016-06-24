var Promise = require('bluebird');
var webrtc = require('webrtc-adapter');

function MediaDevicesShim() {
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Parameters
 * @typedef {Object} MediaStreamConstraints
 */

/**
 * @param {MediaStreamConstraints} constraints
 * @returns {Promise}
 * @fulfilled {MediaStream} stream
 */
MediaDevicesShim.getUserMedia = function(constraints) {
  if (constraints.video === 'screen') {
    return this.getSharedScreen({audio: constraints.audio});
  } else {
    return Promise.resolve(navigator.mediaDevices.getUserMedia(constraints));
  }
};

/**
 * @param {MediaStreamConstraints} constraints only 'audio'
 * @returns {Promise}
 * @fulfilled {MediaStream} stream
 */
MediaDevicesShim.getSharedScreen = function(constraints) {
  if (window.location.protocol !== 'https:') {
    return Promise.reject(new Error('Screen sharing only works on HTTPS, try the https:// version of this page'));
  }

  if ('chrome' == webrtc.browserDetails.browser) {
    return this._getSharedScreenChrome(constraints);
  } else if ('firefox' == webrtc.browserDetails.browser) {
    return this._getSharedScreenFirefox(constraints);
  }
};

/**
 * @param {MediaStreamConstraints} constraints only 'audio'
 * @returns {Promise}
 * @fulfilled {MediaStream} stream
 */
MediaDevicesShim._getSharedScreenChrome = function(constraints) {
  var chromever = webrtc.browserDetails.version;
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

/**
 * @param {MediaStreamConstraints} constraints only 'audio'
 * @returns {Promise}
 * @fulfilled {MediaStream} stream
 */
MediaDevicesShim._getSharedScreenFirefox = function(constraints) {
  var ffver = webrtc.browserDetails.version;
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
    var error = new Error('Your version of Firefox does not support screen sharing, please install Firefox 33 (or more recent versions)');
    return Promise.reject(error);
  }
};

module.exports = MediaDevicesShim;
