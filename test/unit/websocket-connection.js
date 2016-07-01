var assert = require('chai').assert;
var WebsocketServer = require('./helpers/websocket-server');
var WebsocketConnection = require('../../src/websocket-connection');

describe('WebsocketConnection tests', function() {

  var websocketServer;

  beforeEach(function() {
    websocketServer = new WebsocketServer(8080);
  });

  afterEach(function() {
    websocketServer.close();
  });

  it('create and open', function(done) {
    var connection = new WebsocketConnection();
    connection.on('open', done);
    connection.open(websocketServer.getAddress());
  });

  it('fails to open invalid address', function(done) {
    var connection = new WebsocketConnection();
    connection.open('ws://invalid:666').catch(function() {
      done();
    });
  });

  it('create with existing Node websocket', function(done) {
    var WebSocketClient = require('websocket').client;
    var client = new WebSocketClient();
    client.on('connectFailed', done);
    client.on('connect', function(webSocket) {
      var connection = new WebsocketConnection(webSocket);
      assert.isTrue(connection.isOpened());
      done();
    });
    client.connect(websocketServer.getAddress());
  });

  it('sends message when opened', function(done) {
    var sendMessage = {text: 'text'};

    websocketServer.on('connection', function(serverConnection) {
      serverConnection.on('message', function(message) {
        assert.equal(message, JSON.stringify(sendMessage));
        done();
      });
    });

    var connection = new WebsocketConnection();
    connection.open(websocketServer.getAddress())
      .then(function() {
        connection.send(sendMessage);
      });
  });

  it('queues and sends message after open', function(done) {
    var sendMessage = {text: 'text'};
    var connection = new WebsocketConnection();
    connection.send(sendMessage);

    websocketServer.on('connection', function(serverConnection) {
      serverConnection.on('message', function(message) {
        assert.equal(message, JSON.stringify(sendMessage));
        done();
      });
    });

    connection.open(websocketServer.getAddress());
  });

  it('receives message', function(done) {
    var receiveMessage = {text: 'text'};

    var connection = new WebsocketConnection();
    connection.on('message', function(message) {
      assert.deepEqual(message, receiveMessage);
      done();
    });

    connection.open(websocketServer.getAddress())
      .then(function() {
        websocketServer.send(receiveMessage);
      });
  });

  it('closes properly', function(done) {
    var connection = new WebsocketConnection();

    connection.open(websocketServer.getAddress())
      .then(function() {
        return connection.close();
      })
      .then(function() {
        assert.isFalse(connection.isOpened());
        assert.isTrue(connection.isClosed());
        return connection.send({});
      })
      .catch(function(error) {
        assert.include(error.message, 'closed');
        done();
      });
  });

});
