var assert = require('chai').assert;
var sinon = require('sinon');
var _ = require('underscore');
var Promise = require('bluebird');
var Transaction = require('../../src/transaction');
var JanusError = require('../../src/error');
var Session = require('../../src/session');
var Connection = require('../../src/connection');
var JanusMessage = require('../../src/janus-message');
var TTransactionGateway = require('../../src/traits/t-transaction-gateway');

describe('Connection tests', function() {

  it('implements TransactionGateway', function() {
    var connection = new Connection('id', '');
    _.each(TTransactionGateway, function(method, methodName) {
      assert(connection[methodName])
    });
  });

  it('opens connection with right parameters', function(done) {
    var connection = new Connection('id', 'address');
    sinon.stub(connection._websocketConnection, 'open', function(address, protocol) {
      assert.equal(address, 'address');
      assert.equal(protocol, 'janus-protocol');
      done();
      return Promise.resolve();
    });
    connection.open();
  });

  it('_send adds token and apisecret', function(done) {
    var connection = new Connection('id', '', {apisecret: 'apisecret', token: 'token'}
    );
    sinon.stub(connection._websocketConnection, 'send', function(message) {
      assert.equal(message['apisecret'], 'apisecret');
      assert.equal(message['token'], 'token');
      done();
    });
    connection.send({});
  });

  context('CRUD with session', function() {
    var connection, session;

    beforeEach(function() {
      connection = new Connection('id', '');
      session = new Session(connection, 'id');
    });

    it('add session', function() {
      assert.isFalse(connection.hasSession(session.getId()));
      connection.addSession(session);
      assert.isTrue(connection.hasSession(session.getId()));
      assert.strictEqual(connection.getSession(session.getId()), session);
      assert.deepEqual(connection.getSessionList(), [session]);
    });

    it('remove session', function() {
      connection.addSession(session);
      connection.removeSession(session.getId());
      assert.isFalse(connection.hasSession(session.getId()));
      assert.isUndefined(connection.getSession(session.getId()));
      assert.deepEqual(connection.getSessionList(), []);
    });

  });

  context('processIncomingMessage check', function() {
    var connection;

    beforeEach(function() {
      connection = new Connection('id', '');
    });

    it('transaction execution', function(done) {
      var messageToProcess = new JanusMessage({transaction: Transaction.generateRandomId()});
      sinon.stub(connection.getTransactions(), 'has')
        .withArgs(messageToProcess.get('transaction'))
        .returns(true);
      sinon.stub(connection.getTransactions(), 'execute', function(transactionId, message) {
        assert.equal(transactionId, message.get('transaction'));
        assert.strictEqual(message, messageToProcess);
        done();
        return Promise.resolve();
      });
      connection.processIncomeMessage(messageToProcess);
    });

    context('session delegation', function() {
      var session;

      beforeEach(function() {
        session = new Session(connection, 'id');
        connection.addSession(session);
      });

      it('delegates for existing session', function(done) {
        var messageToProcess = new JanusMessage({session_id: session.getId()});
        sinon.stub(session, 'processIncomeMessage', function(incomeMessage) {
          assert.equal(incomeMessage, messageToProcess);
          done();
          return Promise.resolve();
        });

        connection.processIncomeMessage(messageToProcess).catch(done);
      });

      it('rejects for non existing session', function(done) {
        var messageToProcess = new JanusMessage({session_id: 'unknown'});
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
      connection = new Connection('id', '');
      session = new Session(connection, 'id');
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

  context('sendSync work', function() {
    var connection;

    beforeEach(function() {
      connection = new Connection('id', '');
      sinon.stub(connection, 'send').returns(Promise.resolve());
    });

    it('adds transaction_id to message if it is not present', function(done) {
      var message = {};
      connection.sendSync(message).then(function() {
          assert.isString(message['transaction']);
          assert(message['transaction'].trim().length > 0);
          done();
        })
        .catch(done);
    });

    it('resolves after transaction is resolved', function(done) {
      var message = {transaction: 'id-test-transaction-resolved'};
      var transaction = new Transaction(message.transaction, function() {
        return 'transaction resolved';
      });
      connection.addTransaction(transaction);
      connection.sendSync(message)
        .then(function(result) {
          assert.equal(result, 'transaction resolved');
          done();
        })
        .catch(done);

      //emulate transaction message
      _.delay(function() {
        connection._websocketConnection.emit('message', message);
      }, 100);
    });

  });

  context('create session', function() {
    var connection;

    beforeEach(function() {
      connection = new Connection('id', '');
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
          assert.instanceOf(session, Session);
          assert.equal(session.getId(), incomeCreateSessionMessage.data.id);
          done();
        })
        .catch(done);

      _.delay(function() {
        var sentMessage = connection.send.firstCall.args[0];
        incomeCreateSessionMessage.transaction = sentMessage.transaction;
        connection._websocketConnection.emit('message', incomeCreateSessionMessage);
      }, 100);
    });

    it('rejects with error on janus error', function(done) {
      connection.on('error', function() {
        //just ignore it.
      });
      var incomeCreateSessionMessage = {
        janus: 'error',
        error: {
          code: 0,
          reason: ''
        }
      };
      connection.createSession()
        .then(function() {
          done(new Error('Session should not be created'));
        })
        .catch(function(error) {
          assert.instanceOf(error, JanusError);
          done();
        });

      _.delay(function() {
        var sentMessage = connection.send.firstCall.args[0];
        incomeCreateSessionMessage.transaction = sentMessage.transaction;
        connection._websocketConnection.emit('message', incomeCreateSessionMessage);
      }, 100);
    });
  });

});
