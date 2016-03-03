var assert = require('chai').assert;
var _ = require('underscore');
var Transaction = require('../src/transaction');

describe('single Transaction tests', function() {

  it('transaction callback returns scalar value', function(done) {
    var transaction = new Transaction('id', _.constant('success'));
    transaction.execute()
      .then(function(result) {
        assert.equal(result, 'success');
        done();
      })
      .catch(done);
  });

  it('transaction callback returns promise', function(done) {
    var transaction = new Transaction('id', _.constant(Promise.resolve('resolved')));
    transaction.execute()
      .then(function(result) {
        assert.equal(result, 'resolved');
        done();
      })
      .catch(done);
  });

  it('transaction.promise is resolved after execute', function(done) {
    var transaction = new Transaction('id', _.constant('success'));
    transaction.promise
      .then(function(result) {
        assert.equal(result, 'success');
        done();
      })
      .catch(done);
    transaction.execute();
  });

  it('transaction callback throws exception', function(done) {
    var transaction = new Transaction('id', function() {
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

});
