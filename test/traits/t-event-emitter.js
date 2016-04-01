var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('events');
var Helpers = require('../../src/helpers');
var TEventEmitter = require('../../src/traits/t-event-emitter');

describe('TEventEmitter tests', function() {

  var testingObject;
  beforeEach(function() {
    var TestObject = function() {
    };
    Helpers.extend(TestObject.prototype, TEventEmitter);
    testingObject = new TestObject();
  });

  it('creates EventEmitter implicitly', function() {
    assert.instanceOf(testingObject.getEmitter(), EventEmitter);
  });

  it('delegates to EventEmitter instance', function() {
    var emitter = {};
    testingObject._emitter = emitter;
    ['on', 'once', 'emit', 'removeListener', 'removeAllListeners'].forEach(function(methodName) {
      emitter[methodName] = sinon.stub();
      testingObject[methodName]('arg');
      assert.isTrue(emitter[methodName].withArgs('arg').calledOnce);
    });
  });

});
