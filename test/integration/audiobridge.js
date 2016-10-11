describe('Audiobridge tests', function() {
  var janusConnection;
  var janusSession;
  var audiobridgePlugin;

  function randomRoomId() {
    return Math.floor(Math.random() * 1000 + 1);
  }

  before(function() {
    this.timeout(4000);
    $('body').append('<audio id="audio" autoplay="true"></audio>');

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
    $('#audio').remove();

    return janusSession.destroy()
      .then(function() {
        return janusConnection.close();
      });
  });

  beforeEach(function() {
    return janusSession.attachPlugin(Janus.AudiobridgePlugin.NAME)
      .then(function(plugin) {
        audiobridgePlugin = plugin;
      });
  });

  afterEach(function() {
    return audiobridgePlugin.detach();
  });

  it('creates, connects, lists', function() {
    var roomId = randomRoomId();
    return audiobridgePlugin.create(roomId)
      .then(function(response) {
        assert.equal(response.getResultText(), 'created');
        return audiobridgePlugin.join(roomId);
      })
      .then(function(response) {
        assert.equal(response.getResultText(), 'joined');
        return audiobridgePlugin.list();
      })
      .then(function(response) {
        var rooms = response.getPluginData('list');
        var createdRoom = jQuery.grep(rooms, function(room) {
          return room.room == roomId;
        });
        assert.equal(createdRoom.length, 1);
      });
  });

  it('lists participants', function() {
    var roomId = randomRoomId();
    return audiobridgePlugin.create(roomId)
      .then(function() {
        return audiobridgePlugin.connect(roomId);
      })
      .then(function() {
        return audiobridgePlugin.listParticipants(roomId);
      })
      .then(function(response) {
        var participants = response.getPluginData('participants');
        assert.equal(participants.length, 1);
      });
  });

  it('changes room when connect', function() {
    var roomId1 = randomRoomId();
    var roomId2 = randomRoomId();
    return audiobridgePlugin.create(roomId1)
      .then(function() {
        return audiobridgePlugin.create(roomId2);
      })
      .then(function() {
        return audiobridgePlugin.connect(roomId1);
      })
      .then(function() {
        return audiobridgePlugin.connect(roomId2);
      })
      .then(function(response) {
        assert.equal(response.getResultText(), 'roomchanged');
      });
  });

  it('starts media streaming', function(done) {
    var roomId = randomRoomId();

    var audio = document.getElementById('audio');
    audio.addEventListener('playing', function() {
      done();
    });

    audiobridgePlugin.on('pc:track:remote', function(event) {
      assert(event.streams[0]);
      adapter.browserShim.attachMediaStream(audio, event.streams[0]);
    });

    audiobridgePlugin.create(roomId)
      .then(function() {
        return audiobridgePlugin.connect(roomId);
      })
      .then(function() {
        return audiobridgePlugin.getUserMedia({audio: true, video: false});
      })
      .then(function(stream) {
        return audiobridgePlugin.offerStream(stream, null, {muted: false});
      });
  });

  it.skip('stops media on detach', function() {
    var roomId = randomRoomId();
    var audio = document.getElementById('audio');

    return audiobridgePlugin.create(roomId)
      .then(function() {
        return audiobridgePlugin.connect(roomId);
      })
      .then(function() {
        return audiobridgePlugin.getUserMedia({audio: true, video: false});
      })
      .then(function(stream) {
        return audiobridgePlugin.offerStream(stream, null, {muted: false});
      })
      .delay(1000)
      .then(function() {
        assert.strictEqual(audio.paused, false);
        return audiobridgePlugin.detach();
      })
      .delay(300)
      .then(function() {
        assert.strictEqual(audio.paused, true);
      });
  });

});
