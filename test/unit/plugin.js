var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events');
var Promise = require('bluebird');
var Session = require('../../src/session');
var Plugin = require('../../src/plugin');
var JanusMessage = require('../../src/janus-message');

describe('Plugin tests', function() {

  var session;
  beforeEach(function() {
    session = sinon.createStubInstance(Session);
  });

  context('create factory', function() {

    it('creates Plugin for unregistered', function() {
      function UnknownPlugin() {
        throw new Error('Should be ignored');
      }

      UnknownPlugin.NAME = 'unknown';

      var plugin = Plugin.create(session, UnknownPlugin.NAME, 'id');
      assert.instanceOf(plugin, Plugin);
      assert.notInstanceOf(plugin, UnknownPlugin);
    });

    it('creates registered', function() {
      function KnownPlugin() {
      }
      KnownPlugin.NAME = 'known';
      Plugin.register(KnownPlugin.NAME, KnownPlugin);

      var plugin = Plugin.create(session, KnownPlugin.NAME, 'id');
      assert.instanceOf(plugin, KnownPlugin);
    });

  });

  context('basic operations', function() {
    var plugin;

    beforeEach(function() {
      plugin = new Plugin(session, 'name', 'id');
    });

    it('is created correctly', function() {
      assert.equal(plugin.getId(), 'id');
      assert.strictEqual(plugin._session, session);
    });

    it('is detached on session destroy', function(done) {
      session = new EventEmitter;
      plugin = new Plugin(session, '', '');
      sinon.spy(plugin, '_detach');
      plugin.on('detach', function() {
        assert.isTrue(plugin._detach.calledOnce);
        done();
      });
      session.emit('destroy');
    });

    it('sends message with plugin_id', function() {
      var message;
      message = {};
      plugin.send(message);
      assert.equal(message.handle_id, plugin.getId());
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
      plugin = new Plugin(session, 'name', 'id');
    });

    it('calls _onDetached for detached message', function(done) {
      sinon.stub(plugin, '_onDetached');
      var message = new JanusMessage({janus: 'detached'});
      plugin.processIncomeMessage(message).then(function() {
        assert.isTrue(plugin._onDetached.calledOnce);
        done();
      });
    });

    it('emits incoming message', function(done) {
      var incomeMessage = new JanusMessage({janus: 'message'});
      plugin.on('message', function(message) {
        assert.equal(message.getPlainMessage(), incomeMessage.getPlainMessage());
        done();
      });
      plugin.processIncomeMessage(incomeMessage);
    });

  });

  context('`_on` message callbacks', function() {
    var plugin;

    beforeEach(function() {
      plugin = new Plugin(session, 'name', 'id');
    });

    it('_onDetached calls detach', function() {
      sinon.spy(plugin, '_detach');
      plugin._onDetached({});
      assert.isTrue(plugin._detach.calledOnce);
    });

  });

});
