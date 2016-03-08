var Helpers = {

  extend: function() {
    var destination = arguments[0];
    var sources = Array.prototype.slice.call(arguments, 1) || [];

    sources.forEach(function(source) {
      Object.keys(source).forEach(function(key) {
        destination[key] = source[key];
      });
    });

    return destination;
  }
};

module.exports = Helpers;
