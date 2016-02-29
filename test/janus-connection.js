var assert = require('chai').assert;
var sinon = require('sinon');
var _ = require('underscore');
var Promise = require('bluebird');
var Transaction = require('../src/transaction');
var JanusError = require('../src/error').JanusError;
var JanusSession = require('../src/janus-session');
var JanusConnection = require('../src/janus-connection');

describe('JanusConnection tests', function() {

  it('generates unique transaction id', function() {
    var connection = new JanusConnection('id', {address: ''});
    var transactionId1 = connection.generateTransactionId();
    assert.match(transactionId1, /[\w]{7,}/);

    var transactionId2 = connection.generateTransactionId();
    assert.notEqual(transactionId1, transactionId2);
  });

  it('adds transaction', function(done) {
    var connection = new JanusConnection('id', {address: ''});
    var transactionToAdd = {id: 'id'};
    sinon.stub(connection._transactions, 'add', function(transaction) {
      assert.equal(transaction, transactionToAdd);
      done();
    });
    connection.addTransaction(transactionToAdd);
  });

  it('opens connection with right parameters', function(done) {
    sinon.stub(JanusConnection.super_.prototype, 'open', function(address, protocol) {
      assert.equal(address, 'address');
      assert.equal(protocol, 'janus-protocol');
      JanusConnection.super_.prototype.open.restore();
      done();
    });
    var connection = new JanusConnection('id', {address: 'address'});
    connection.open();
  });

  it('_send adds token and apisecret', function(done) {
    sinon.stub(JanusConnection.super_.prototype, '_send', function(message) {
      assert.equal(message['apisecret'], 'apisecret');
      assert.equal(message['token'], 'token');
      JanusConnection.super_.prototype._send.restore();
      done();
    });
    var connection = new JanusConnection('id',
      {address: '', apisecret: 'apisecret', token: 'token'}
    );
    connection._send({});
  });

  context('CRUD with session', function() {
    var connection, session;

    beforeEach(function() {
      connection = new JanusConnection('id', {address: ''});
      session = new JanusSession(connection, 'id');
    });

    it('add session', function() {
      assert.isFalse(connection.hasSession(session.getId()));
      connection.addSession(session);
      assert.isTrue(connection.hasSession(session.getId()));
      assert.strictEqual(connection.getSession(session.getId()), session);
    });

    it('remove session', function() {
      connection.addSession(session);
      connection.removeSession(session.getId());
      assert.isFalse(connection.hasSession(session.getId()));
      assert.isUndefined(connection.getSession(session.getId()));
    });

  });

  context('processIncomingMessage check', function() {
    var connection;

    beforeEach(function() {
      connection = new JanusConnection('id', {address: ''});
    });

    it('transaction execution', function(done) {
      var messageToProcess = {transaction: connection.generateTransactionId()};
      sinon.stub(connection._transactions, 'find')
        .withArgs(messageToProcess.transaction)
        .returns(true);
      sinon.stub(connection._transactions, 'execute', function(transactionId, message) {
        assert.equal(transactionId, message.transaction);
        assert.strictEqual(message, messageToProcess);
        done();
        return Promise.resolve();
      });
      connection.processIncomeMessage(messageToProcess);
    });

    context('session delegation', function() {
      var session;

      beforeEach(function() {
        session = new JanusSession(connection, 'id');
        connection.addSession(session);
      });

      it('delegates for existing session', function(done) {
        var messageToProcess = {session_id: session.getId()};
        sinon.stub(session, 'processIncomeMessage')
          .withArgs(messageToProcess)
          .returns(Promise.resolve('processed by session'));

        connection.processIncomeMessage(messageToProcess)
          .then(function(result) {
            assert.equal(result, 'processed by session');
            done();
          })
          .catch(done);
      });

      it('rejects for non existing session', function(done) {
        var messageToProcess = {session_id: 'unknown'};
        connection.processIncomeMessage(messageToProcess)
          .then(function() {
            done(new Error('income message should not be processed by session'));
          })
          .catch(function(error) {
            assert.match(error.message, /invalid session/i);
            done();
          });
      });

    });

  });

  context('processOutcomeMessage check', function() {
    var connection, session;

    beforeEach(function() {
      connection = new JanusConnection('id', {address: ''});
      session = new JanusSession(connection, 'id');
      connection.addSession(session);
    });


    it('delegates for existing session', function(done) {
      var messageToProcess = {session_id: session.getId()};
      sinon.stub(session, 'processOutcomeMessage')
        .withArgs(messageToProcess)
        .returns(Promise.resolve('processed by session'));
      connection.processOutcomeMessage(messageToProcess)
        .then(function(result) {
          assert.equal(result, 'processed by session');
          done();
        })
        .catch(done);
    });

    it('rejects for non existing session', function(done) {
      var messageToProcess = {session_id: 'unknown'};
      connection.processOutcomeMessage(messageToProcess)
        .then(function() {
          done(new Error('outcome message should not be processed by session'));
        })
        .catch(function(error) {
          assert.match(error.message, /invalid session/i);
          done();
        });
    });

  });

  context('sendTransaction work', function() {
    var connection;

    beforeEach(function() {
      connection = new JanusConnection('id', {address: ''});
      sinon.stub(connection, 'send').returns(Promise.resolve());
    });

    it('adds transaction_id to message if it is not present', function(done) {
      var message = {};
      connection.sendTransaction(message).then(function() {
          assert.isString(message['transaction']);
          assert(message['transaction'].trim().length > 0);
          done();
        })
        .catch(done);
    });

    it('resolves after transaction is resolved', function(done) {
      var message = {transaction: 'id'};
      var transaction = new Transaction(message.transaction, function() {
        return 'transaction resolved';
      });
      connection.addTransaction(transaction);
      connection.sendTransaction(message)
        .then(function(result) {
          assert.equal(result, 'transaction resolved');
          done();
        })
        .catch(done);

      //emulate transaction message
      _.delay(function() {
        connection.onMessage(message);
      }, 100);
    });

  });

  context('create session', function() {
    var connection;

    beforeEach(function() {
      connection = new JanusConnection('id', {address: ''});
      sinon.stub(connection, 'send').returns(Promise.resolve());
    });

    it('resolves with session on janus success', function(done) {
      var incomeCreateSessionMessage = {
        janus: 'success',
        data: {
          id: 'id'
        }
      };
      connection.createSession()
        .then(function(session) {
          assert.instanceOf(session, JanusSession);
          assert.equal(session.getId(), incomeCreateSessionMessage.data.id);
          done();
        })
        .catch(done);

      _.delay(function() {
        var sentMessage = connection.send.firstCall.args[0];
        incomeCreateSessionMessage.transaction = sentMessage.transaction;
        connection.onMessage(incomeCreateSessionMessage);
      }, 100);
    });

    it('rejects with error on janus error', function(done) {
      connection.on('error', function() {
        //just ignore it.
      });
      var incomeCreateSessionMessage = {
        janus: 'error'
      };
      connection.createSession()
        .then(function() {
          done(new Error('JanusSession should not be created'));
        })
        .catch(function(error) {
          assert.instanceOf(error, JanusError);
          done();
        });

      _.delay(function() {
        var sentMessage = connection.send.firstCall.args[0];
        incomeCreateSessionMessage.transaction = sentMessage.transaction;
        connection.onMessage(incomeCreateSessionMessage);
      }, 100);
    });
  });

});
