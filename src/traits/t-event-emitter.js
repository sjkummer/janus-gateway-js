var EventEmitter = require('events');

/**
 * @class TEventEmitter
 * @extends EventEmitter
 */
var TEventEmitter = {
  /**
   * @returns {EventEmitter}
   */
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

