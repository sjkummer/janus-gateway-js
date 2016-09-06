describe('Audioroom tests', function() {
  var janusConnection;
  var janusSession;
  var audioroomPlugin;

  function randomRoomId() {
    return Math.random().toString().substring(2, 12);
  }

  before(function() {
    this.timeout(4000);
    $('body').append('<audio id="audio" autoplay></audio>');

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
    return janusSession.attachPlugin(Janus.AudioroomPlugin.NAME)
      .then(function(plugin) {
        audioroomPlugin = plugin;
      });
  });

  afterEach(function() {
    return audioroomPlugin.detach();
  });

  it('connects, lists', function() {
    var roomId = randomRoomId();
    return audioroomPlugin.connect(roomId)
      .then(function(response) {
        assert.equal(response.getData('audioroom'), 'joined');
        return audioroomPlugin.list();
      })
      .then(function(response) {
        var rooms = response.getData('list');
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
        var participants = response.getData('participants');
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
        assert.equal(response.getData('audioroom'), 'roomchanged');
      });
  });

  it('starts media streaming', function(done) {
    var roomId = randomRoomId();

    var audio = document.getElementById('audio');
    audio.addEventListener('playing', function() {
      done();
    });

    audioroomPlugin.on('pc:addstream', function(event) {
      assert(event.stream);
      adapter.browserShim.attachMediaStream(audio, event.stream);
    });

    audioroomPlugin.connect(roomId)
      .then(function() {
        return audioroomPlugin.startMediaStreaming({muted: false});
      });
  });

  it('stops media on detach', function() {
    var roomId = randomRoomId();
    var pc;

    return audioroomPlugin.connect(roomId)
      .then(function() {
        return audioroomPlugin.startMediaStreaming({muted: false});
      })
      .delay(1000)
      .then(function() {
        pc = audioroomPlugin._pc;
        var localStreams = pc.getLocalStreams();
        assert.strictEqual(localStreams.length, 1);
        assert.strictEqual(localStreams[0].active, true);

        return audioroomPlugin.detach();
      })
      .then(function() {
        assert.strictEqual(pc.getLocalStreams()[0].active, false);
      });
  });

});
