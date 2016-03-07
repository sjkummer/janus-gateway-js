var Trait = require('light-traits').Trait;
var TEventEmitter = require('./t-event-emitter');
var TTransactionsGateway = require('./t-transactions-gateway');

module.exports = function() {
  return Trait.compose(TEventEmitter(), TTransactionsGateway());
};
