var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');
var Helpers = require('../../../src/helpers');
var TTransactionGateway = require('../../../src/traits/t-transaction-gateway');
var Transaction = require('../../../src/transaction');
var Transactions = require('../../../src/transactions');
var JanusMessage = require('../../../src/janus-message');

describe('TTransactionGateway tests', function() {

  var testingObject;
  beforeEach(function() {
    var TestObject = function() {
    };
    Helpers.extend(TestObject.prototype, TTransactionGateway);
    testingObject = new TestObject();
  });

  it('creates transaction implicitly', function() {
    assert.instanceOf(testingObject.getTransactions(), Transactions);
  });

  it('adds transaction', function() {
    const id = 'id-test-adds-transaction';
    assert.isFalse(testingObject.getTransactions().has(id));
    var transaction = new Transaction(id);
    transaction.promise.catch(() => {});
    testingObject.addTransaction(transaction);
    assert.isTrue(testingObject.getTransactions().has(id));
  });

  it('executes transaction', function(done) {
    var transaction = new Transaction('id-test-executes-transaction');
    var executedMessage = new JanusMessage({transaction: transaction.id});
    sinon.stub(testingObject.getTransactions(), '_find', function() {
      return transaction;
    });
    sinon.stub(transaction, 'execute', function(message) {
      assert.strictEqual(message, executedMessage);
      done();
      return Promise.resolve();
    });
    testingObject.executeTransaction(executedMessage);
  });

  context('sendSync message', function() {

    beforeEach(function() {
      testingObject.processOutcomeMessage = Promise.resolve;
      testingObject.send = Promise.resolve;
    });

    it('generates transaction', function(done) {
      var message = {};
      testingObject.sendSync(message).then(function() {
        assert(message['transaction']);
        done();
      });
    });

    it('returns transaction.promise', function(done) {
      var transaction = new Transaction('id-test-transaction-promise', function() {
        return Promise.resolve('success');
      });
      sinon.stub(testingObject.getTransactions(), '_find', function() {
        return transaction;
      });

      testingObject.sendSync({}).then(function(result) {
        assert.equal(result, 'success');
        done();
      });
      transaction.execute();
    });
  });

});
