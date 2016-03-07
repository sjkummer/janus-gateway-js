var EventEmitter = require('events');
var Trait = require('light-traits').Trait;

function TEventEmitter() {
  var trait = {
    getEmitter: function() {
      if (!this._emitter) {
        this._emitter = new EventEmitter();
      }
      return this._emitter;
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

