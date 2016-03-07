var EventEmitter = require('events');
var Trait = require('light-traits').Trait;

function TEventEmitter() {
  var emitter = new EventEmitter();
  var trait = {
    getEmitter: function() {
      return emitter
    }
  };

  ['on', 'once', 'emit', 'removeListener', 'removeAllListeners'].forEach(function(method) {
    trait[method] = function() {
      this.getEmitter()[method].apply(this.getEmitter(), arguments);
    };
  });

  return Trait(trait);
}

module.exports = TEventEmitter;

