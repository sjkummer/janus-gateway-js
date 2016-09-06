describe('Janus basic tests', function() {
  var janusConfig;

  before(function() {
    this.timeout(4000);
    return jQuery.getJSON('./config.json')
      .then(function(config) {
        janusConfig = config;
      });
  });

  it('creates connection', function() {
    var janus = new Janus.Client(janusConfig.url, janusConfig);
    return janus.createConnection('client')
      .then(function(connection) {
        assert(connection);
        return connection.close();
      });
  });

  it('creates session', function() {
    var janus = new Janus.Client(janusConfig.url, janusConfig);
    var janusConnection;
    return janus.createConnection('client')
      .then(function(connection) {
        janusConnection = connection;
        return connection.createSession();
      })
      .then(function(session) {
        assert(session);
        return session.destroy();
      })
      .then(function() {
        return janusConnection.close();
      });
  });

});
