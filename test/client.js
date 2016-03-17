var assert = require('chai').assert;
var sinon = require('sinon');
var Connection = require('../src/connection');
var Client = require('../src/client');

describe('Client tests', function() {

  it('is created correctly', function() {
    var client = new Client('address', {foo: 'bar'});
    assert.equal(client._address, 'address');
    assert.deepEqual(client._options, {foo: 'bar'});
  });


  it('creates an opened connection', function() {
    var client = new Client('', {});
    var connection = {
      open: function() {
        return 'opened'
      }
    };
    sinon.stub(Connection, 'create', function() {
      return connection;
    });

    assert.equal(client.createConnection(''), 'opened');
    Connection.create.restore();
  });
});
