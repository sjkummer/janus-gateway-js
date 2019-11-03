var assert = require('chai').assert;
var _ = require('underscore');
var Transaction = require('../../src/transaction');

describe('single Transaction tests', function() {

  it('generates unique transaction id', function() {
    var transactionId1 = Transaction.generateRandomId();
    assert.match(transactionId1, /[\w]{7,}/);

    var transactionId2 = Transaction.generateRandomId();
    assert.notEqual(transactionId1, transactionId2);
  });

  it('transaction callback returns scalar value', function(done) {
    var transaction = new Transaction('id-test-scalar-value', _.constant('success'));
    transaction.execute()
      .then(function(result) {
        assert.equal(result, 'success');
        done();
      })
      .catch(done);
  });

  it('transaction callback returns promise', function(done) {
    var transaction = new Transaction('id-test-returns-promise', _.constant(Promise.resolve('resolved')));
    transaction.execute()
      .then(function(result) {
        assert.equal(result, 'resolved');
        done();
      })
      .catch(done);
  });

  it('transaction.promise is resolved after execute', function(done) {
    var transaction = new Transaction('id-test-resolve-after-execute', _.constant('success'));
    transaction.promise
      .then(function(result) {
        assert.equal(result, 'success');
        done();
      })
      .catch(done);
    transaction.execute();
  });

  it('transaction callback throws exception', function(done) {
    var transaction = new Transaction('id-throws-exception', function() {
      throw new Error('error');
    });
    transaction.execute().catch(function(error) {
      assert.equal(error.message, 'error');
      transaction.promise.catch(function(error) {
        assert.equal(error.message, 'error');
        done();
      });
    });
  });

  context('timeout', function() {

    it('rejects if timeout exceeds', function(done) {
      var transaction = new Transaction('id-test-timeout', _.constant('success'), 100);
      transaction.promise
        .then(function() {
          done(new Error('Must be timeout error'));
        })
        .catch(function(error) {
          assert.include(error.message, 'timeout');
          assert.strictEqual(transaction.execute(), transaction.promise);
          done();
        });
    });

    it('clears timeout otherwise', function(done) {
      var timeoutTime = 100;
      var transaction = new Transaction('id-test-clear-timeout', _.constant('success'), timeoutTime);
      transaction.promise.catch(done);
      transaction.execute();
      setTimeout(function() {
        assert.isTrue(transaction.promise.isFulfilled());
        done();
      }, timeoutTime + 10);
    })
  });

});
