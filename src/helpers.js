var Helpers = {

  /**
   * @param {Object} destination
   * @param {...Object|null} source
   * @returns {Object}
   */
  extend: function(destination, source) {
    if (source) {
      var sources = Array.prototype.slice.call(arguments, 1) || [];
      sources.forEach(function(source) {
        Object.keys(source).forEach(function(key) {
          console.log('foreach iceservers', `${key}: ${source[key]}`, destination["iceServers"])
          if (key === "servers") {
            console.log('before map iceservers', source)
            Array.prototype.push.apply(source[key], destination["iceServers"])
            destination["iceServers"] = source[key]
          } else {
            destination[key] = source[key];
          }
        });
      });
      console.log('after map iceservers', destination, source)
    }

    return destination;
  },
  /**
   * @param {Function} ctor
   * @param {Function} superCtor
   */
  inherits: function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  },
  /**
   * @param {Object} configs
   * @returns {Object}
   */
   normalizeIceServers: function(iceServer) {
    if (iceServer) {
      Object.keys(iceServer).forEach(function(key) {
        if (key === "stun") {
          iceServer[key].urls = `${iceServer[key].uri}:${iceServer[key].port}`
        }
        if (key === "turn") {
          iceServer[key].urls = `${iceServer[key].uri}:${iceServer[key].port}`
          iceServer[key].username = `${iceServer[key].user}`
        }
      })
    }
    return iceServer
  }
};

module.exports = Helpers;
