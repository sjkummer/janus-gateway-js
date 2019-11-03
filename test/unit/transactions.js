var assert = require('chai').assert;
var _ = require('underscore');
var Transaction = require('../../src/transaction');
var Transactions = require('../../src/transactions');

describe('Transactions tests', function() {

  this.timeout(2000);

  it('adds/removes transactions', function() {
    var transactions = new Transactions();
    var transaction = new Transaction('id-adds-remove-transaction', _.identity);
    transaction.promise.catch(() => {});

    assert.throws(function() {
      transactions.add(_.constant());
    }, 'instance of Transaction');
    assert(!transactions.has(transaction.id));
    assert.throws(function() {
      transactions.remove(transaction.id);
    }, 'doesn\'t exist');
    assert.throws(function() {
      transactions.execute(transaction.id, {});
    }, 'not found');

    transactions.add(transaction);
    assert(transactions.has(transaction.id));
    assert.throws(function() {
      transactions.add(transaction);
    }, 'exists');
    transactions.remove(transaction.id);
    assert(!transactions.has(transaction.id));
  });

  it('removes transaction after execution', function(done) {
    var transactions = new Transactions();
    var transaction = new Transaction('id-remove-transaction-after-execution', _.identity);

    transactions.add(transaction);
    transactions.execute(transaction.id, {janus: 'success'})
      .then(function(message) {
        assert.deepEqual(message, {janus: 'success'});
        assert(!transactions.has(transaction.id));
        done();
      })
      .catch(done);
  });

  it('does not execute `ack` transactions', function(done) {
    var transactions = new Transactions();
    var transaction = new Transaction('id-test-not-execute-ack', _.identity);
    transactions.add(transaction);
    transactions.execute(transaction.id, {janus: 'ack'})
      .then(function(message) {
        assert.deepEqual(message, {janus: 'ack'});
        assert(transactions.has(transaction.id));
        transaction.promise.catch(() => {});
        done();
      })
      .catch(done);
  });

});
