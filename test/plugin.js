var assert = require('chai').assert;
var sinon = require('sinon');
var _ = require('underscore');
var Promise = require('bluebird');
var JanusError = require('../src/error');
var Connection = require('../src/connection');
var Session = require('../src/session');
var Plugin = require('../src/plugin');

describe('Plugin tests', function() {

  context('basic operations', function() {
    var session, plugin;

    beforeEach(function() {
      session = new Session(new Connection, 'id');
      plugin = new Plugin(session, 'name', 'id');
    });

    it('is created correctly', function() {
      assert.equal(plugin.getId(), 'id');
      assert.strictEqual(plugin._session, session);
    });

    it('is detached on session destroy', function(done) {
      sinon.spy(plugin, '_detach');
      plugin.on('detach', function() {
        assert.isTrue(plugin._detach.calledOnce);
        done();
      });
      session._destroy();
    });

    it('sends appropriate plugin formatted message', function() {
      var message;
      sinon.stub(plugin._session, 'send');

      message = {};
      plugin.send(message);
      assert.equal(message.handle_id, plugin.getId());
      assert.equal(message.janus, 'message');
      assert.isTrue(plugin._session.send.calledOnce);
      assert.strictEqual(plugin._session.send.getCall(0).args[0], message);

      message = {handle_id: plugin.getId() + 'bla'};
      plugin.send(message);
      assert.equal(message.handle_id, plugin.getId());
    });

    it('detach sends correct message', function(done) {
      sinon.stub(plugin, 'send', function(message) {
        assert.equal(message.janus, 'detach');
        done();
        return Promise.resolve();
      });
      plugin.detach();
    });

  });

  context('processIncomeMessage check', function() {
    var plugin;

    beforeEach(function() {
      plugin = new Plugin(new Session(new Connection, 'id'), 'name', 'id');
    });

    it('calls _onDetached for detached message', function(done) {
      sinon.stub(plugin, '_onDetached');
      var message = {janus: 'detached'};
      plugin.processIncomeMessage(message).then(function() {
        assert.isTrue(plugin._onDetached.calledOnce);
        assert.equal(plugin._onDetached.getCall(0).args[0], message);
        done();
      });
    });

    it('emits incoming message', function(done) {
      var incomeMessage = {janus: 'message'};
      plugin.on('message', function(message) {
        assert.equal(message, incomeMessage);
        done();
      });
      plugin.processIncomeMessage(incomeMessage);
    });

  });

  context('processOutcomeMessage', function() {
    var plugin;

    beforeEach(function() {
      plugin = new Plugin(new Session(new Connection, 'id'), 'name', 'id');
    });

    it('calls _onDetach for detach message', function() {
      sinon.stub(plugin, '_onDetach');
      var message = {janus: 'detach'};
      plugin.processOutcomeMessage(message);
      assert.isTrue(plugin._onDetach.calledOnce);
      assert.equal(plugin._onDetach.getCall(0).args[0], message);
    });

  });

  context('`_on` message callbacks', function() {
    var plugin;

    beforeEach(function() {
      plugin = new Plugin(new Session(new Connection, 'id'), 'name', 'id');
    });

    it('_onDetached calls detach', function() {
      sinon.spy(plugin, '_detach');
      plugin._onDetached({});
      assert.isTrue(plugin._detach.calledOnce);
    });


    context('_onDetach', function() {
      var message, transaction;

      beforeEach(function() {
        sinon.stub(plugin, 'addTransaction');
        message = {janus: 'detach', transaction: 'transaction'};
        plugin.processOutcomeMessage(message);
        transaction = plugin.addTransaction.getCall(0).args[0];
      });

      it('add transaction if processed', function() {
        assert.isTrue(plugin.addTransaction.calledOnce);
        assert.equal(transaction.id, message.transaction);
      });

      it('resolves on success janus response', function(done) {
        sinon.spy(plugin, '_detach');
        transaction.execute({janus: 'success'})
          .then(function() {
            assert.isFalse(plugin._detach.called);
            done();
          })
          .catch(done);
      });

      it('return Error on error janus response', function(done) {
        //catch error duplication
        transaction.promise.catch(_.noop);

        transaction.execute({janus: 'error'})
          .then(function() {
            done(new Error('Plugin detach must be rejected'));
          })
          .catch(function(error) {
            assert.instanceOf(error, JanusError.Error);
            done();
          });
      });
    });

  });

});
