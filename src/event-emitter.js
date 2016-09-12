var EventEmitter2 = require('eventemitter2');
var Helpers = require('./helpers');

function EventEmitter() {
  EventEmitter.super_.call(this, {
    wildcard: true,
    delimiter: ':',
    newListener: false,
    maxListeners: 20
  });
}

Helpers.inherits(EventEmitter, EventEmitter2);

module.exports = EventEmitter;

