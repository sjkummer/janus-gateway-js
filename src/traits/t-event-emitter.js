var EventEmitter = require('events');

var TEventEmitter = {
  getEmitter: function() {
    if (!this._emitter) {
      this._emitter = new EventEmitter();
    }
    return this._emitter;
  }
};

['on', 'once', 'emit', 'removeListener', 'removeAllListeners'].forEach(function(method) {
  TEventEmitter[method] = function() {
    this.getEmitter()[method].apply(this.getEmitter(), arguments);
  };
});

module.exports = TEventEmitter;

