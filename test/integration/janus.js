describe('Janus basic tests', function() {
  var janusConfig;

  before(function(done) {
    jQuery.getJSON('./config.json')
      .then(function(config) {
        janusConfig = config;
        done();
      });
  });

  it('creates connection', function(done) {
    var janus = new Janus.Client(janusConfig.url, janusConfig);
    janus.createConnection('client')
      .then(function(connection) {
        assert(connection);
        return connection.close();
      })
      .then(done);
  });

  it('creates session', function(done) {
    var janus = new Janus.Client(janusConfig.url, janusConfig);
    var janusConnection;
    janus.createConnection('client')
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
      })
      .then(done);
  });

});
