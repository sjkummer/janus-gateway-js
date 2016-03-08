janus-gateway-js [![Build Status](https://travis-ci.org/cargomedia/janus-gateway-js.svg?branch=master)](https://travis-ci.org/cargomedia/janus-gateway-js) [![codecov.io](https://codecov.io/github/cargomedia/janus-gateway-js/coverage.svg?branch=master)](https://codecov.io/github/cargomedia/janus-gateway-js?branch=master)
================

## About
Modern javascript client for [janus gateway](https://janus.conf.meetecho.com/).

## Example of usage

```js
var janus = new JanusClient({
  token: 'token',
  apisecret: 'apisecret',
  address: 'address'
});

janus.createConnection().then(function(connection) {
  connection.createSession().then(function(session) {
    session.attachPlugin('bla').then(function(plugin) {
      plugin.send({}).then(function(response){});
      plugin.on('message', function(message) {});
      plugin.detach();
    });
  });
});
```
