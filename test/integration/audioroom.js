describe('Audioroom tests', function() {
  var janusConnection;
  var janusSession;
  var audioroomPlugin;

  function randomRoomId() {
    return Math.random().toString().substring(2, 12);
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
        if (janusConnection) {
          return janusConnection.close();
        }
      });
  });

  beforeEach(function() {
    return janusSession.attachPlugin(Janus.AudioroomPlugin.NAME)
      .then(function(plugin) {
        audioroomPlugin = plugin;
      });
  });

  afterEach(function() {
    if (audioroomPlugin) {
      return audioroomPlugin.detach();
    }
  });

  it('connects, lists', function() {
    var roomId = randomRoomId();
    return audioroomPlugin.connect(roomId)
      .then(function(response) {
        assert.equal(response.getResultText(), 'joined');
        return audioroomPlugin.list();
      })
      .then(function(response) {
        var rooms = response.getPluginData('list');
        var createdRoom = jQuery.grep(rooms, function(room) {
          return room.id == roomId;
        });
        assert.equal(createdRoom.length, 1);
      });
  });

  it('lists participants', function() {
    var roomId = randomRoomId();
    return audioroomPlugin.connect(roomId)
      .then(function() {
        return audioroomPlugin.listParticipants(roomId);
      })
      .then(function(response) {
        var participants = response.getPluginData('participants');
        assert.equal(participants.length, 1);
      });
  });

  it('changes room on the fly when connect', function() {
    var roomId1 = randomRoomId();
    var roomId2 = randomRoomId();
    return audioroomPlugin.connect(roomId1)
      .then(function() {
        return audioroomPlugin.connect(roomId2);
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

    audioroomPlugin.on('pc:track:remote', function(event) {
      assert(event.streams[0]);
      adapter.browserShim.attachMediaStream(audio, event.streams[0]);
    });

    audioroomPlugin.connect(roomId)
      .then(function() {
        return audioroomPlugin.getUserMedia({audio: true, video: false});
      })
      .then(function(stream) {
        return audioroomPlugin.offerStream(stream, null, {muted: false});
      });
  });

  it.skip('stops media on detach', function() {
    var roomId = randomRoomId();
    var audio = document.getElementById('audio');

    return audioroomPlugin.connect(roomId)
      .then(function() {
        return audioroomPlugin.getUserMedia({audio: true, video: false});
      })
      .then(function(stream) {
        return audioroomPlugin.offerStream(stream, null, {muted: false});
      })
      .delay(1000)
      .then(function() {
        assert.strictEqual(audio.paused, false);
        return audioroomPlugin.detach();
      })
      .delay(300)
      .then(function() {
        assert.strictEqual(audio.paused, true);
      });
  });

});
