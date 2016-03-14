var assert = require('chai').assert;
var sinon = require('sinon');
var Connection = require('../src/connection');
var Client = require('../src/client');

describe.only('Client tests', function() {

  beforeEach(function() {
    sinon.stub(Connection, 'validateOptions');
  });

  afterEach(function() {
    Connection.validateOptions.restore();
  });

  it('validates constructor options', function() {
    assert.isFalse(Connection.validateOptions.called);
    new Client({});
    assert.isTrue(Connection.validateOptions.calledOnce);
  });

  it('creates an opened connection', function() {
    var client = new Client({});
    var connection = {
      open: function() {
        return 'opened'
      }
    };
    sinon.stub(Connection, 'create', function() {
      return connection;
    });

    assert.equal(client.createConnection(), 'opened');
    Connection.create.restore();
  });
});
