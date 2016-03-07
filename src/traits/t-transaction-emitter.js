var Trait = require('light-traits').Trait;
var TEventEmitter = require('./t-event-emitter');
var TTransactionGateway = require('./t-transaction-gateway');

module.exports = Trait.compose(TEventEmitter(), TTransactionGateway());
