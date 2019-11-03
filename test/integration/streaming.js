describe('Streaming tests', function() {
  var janusConnection;
  var janusSession;
  var streamingPlugin;

  var mountpointOptions = {
    type: 'live',
    description: 'test create stream',
    file: '/usr/share/janus/streams/radio.alaw',
    audio: true,
    video: false
  };

  function randomMountpointId() {
    return Math.floor(Math.random() * 1000 + 1);
  }

  before(function() {
    this.timeout(4000);
    $('body').append('<video id="video" autoplay="true"></video>');

    return jQuery.getJSON('./config.json')
      .then(function(config) {
        var janus = new Janus.Client(config.url, config);
        return janus.createConnection('client');
      })
      .then(function(connection) {
        janusConnection = connection;
        return connection.createSession();
      })
      .then(function(session) {
        janusSession = session;
      });
  });

  after(function() {
    $('#video').remove();

    return janusSession.destroy()
      .then(function() {
        return janusConnection.close();
      });
  });

  beforeEach(function() {
    return janusSession.attachPlugin(Janus.StreamingPlugin.NAME)
      .then(function(plugin) {
        streamingPlugin = plugin;
      });
  });

  afterEach(function() {
    return streamingPlugin.detach();
  });

  it('creates, lists and destroys', function() {
    var mountpointId = randomMountpointId();
    return streamingPlugin.create(mountpointId, mountpointOptions)
      .then(function(response) {
        assert.equal(response.getPluginData('stream', 'id'), mountpointId);
        return streamingPlugin.list();
      })
      .then(function(response) {
        var list = response.getPluginData('list');
        var createdMountpoint = jQuery.grep(list, function(mountpoint) {
          return mountpoint.id == mountpointId;
        });
        assert.equal(createdMountpoint.length, 1);
        return streamingPlugin.destroy(mountpointId);
      })
      .then(function(response) {
        assert.equal(response.getPluginData('destroyed'), mountpointId);
      });
  });

  it('streams video', function(done) {
    this.timeout(20000);
    var video = document.getElementById('video');
    video.addEventListener('playing', function() {
      done();
    });
    streamingPlugin.on('pc:track:remote', function(event) {
      assert(event.streams[0]);
      adapter.browserShim.attachMediaStream(video, event.streams[0]);
    });

    var mountpointId = randomMountpointId();
    streamingPlugin.create(mountpointId, mountpointOptions)
      .then(function() {
        return streamingPlugin.connect(mountpointId);
      })
      .then(function() {
        return streamingPlugin.start();
      });
  });

  it('pauses, starts, stops and destroys', function() {
    this.timeout(5000);
    var mountpointId = randomMountpointId();
    return streamingPlugin.create(mountpointId, mountpointOptions)
      .then(function() {
        return streamingPlugin.connect(mountpointId);
      })
      .delay(300)
      .then(function() {
        return streamingPlugin.pause();
      })
      .delay(300)
      .then(function() {
        return streamingPlugin.start();
      })
      .delay(300)
      .then(function() {
        return streamingPlugin.stop();
      });
  });

});
