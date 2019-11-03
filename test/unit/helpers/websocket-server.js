var _ = require('underscore');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var http = require('http');
var WebSocketServer = require('ws').Server;

function WebsocketServer(port) {
  WebsocketServer.super_.call(this);
  this._connections = [];
  this._port = port || 8080;

  this._http = http.createServer(function(request, response) {
    response.writeHead(404);
    response.end();
  });
  this._http.listen(port);

  this._ws = new WebSocketServer({
    server: this._http
  });

  var server = this;
  this._ws.on('connection', function(connection) {
    connection.on('close', function() {
      server._connections = _.without(server._connections, connection);
    });
    server._connections.push(connection);
    server.emit('connection', connection);
  });
}

util.inherits(WebsocketServer, EventEmitter);

WebsocketServer.prototype.getAddress = function() {
  return 'ws://localhost:' + this._port;
};

WebsocketServer.prototype.send = function(message) {
  this._connections.forEach(function(connection) {
    connection.send(JSON.stringify(message));
  });
};

WebsocketServer.prototype.close = function() {
  this._ws.close();
  this._http.close();
  this._connections.forEach(function(connection) {
    connection.close();
  });
};

module.exports = WebsocketServer;
