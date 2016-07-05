describe('Audioroom tests', function() {
  var janusConnection;
  var janusSession;
  var audioroomPlugin;

  function randomRoomId() {
    return Math.random().toString().substring(2, 12);
  }

  before(function(done) {
    $('#mocha').append('<audio id="audio" autoplay></audio>');

    jQuery.getJSON('./config.json')
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
        done();
      });
  });

  after(function(done) {
    janusSession.destroy()
      .then(function() {
        return janusConnection.close();
      })
      .then(done);
  });

  beforeEach(function(done) {
    janusSession.attachPlugin(Janus.AudioroomPlugin.NAME)
      .then(function(plugin) {
        audioroomPlugin = plugin;
        done();
      });
  });

  afterEach(function(done) {
    audioroomPlugin.detach().then(done);
  });

  it('connects, lists', function(done) {
    var roomId = randomRoomId();
    audioroomPlugin.connect(roomId)
      .then(function(response) {
        assert.equal(response['plugindata']['data']['audioroom'], 'joined');
        return audioroomPlugin.list();
      })
      .then(function(rooms) {
        var createdRoom = jQuery.grep(rooms, function(room) {
          return room.id == roomId;
        });
        assert.equal(createdRoom.length, 1);
        done();
      });
  });

  it('lists participants', function(done) {
    var roomId = randomRoomId();
    audioroomPlugin.connect(roomId)
      .then(function() {
        return audioroomPlugin.listParticipants(roomId);
      })
      .then(function(participants) {
        assert.equal(participants.length, 1);
        done();
      });
  });

  it('changes room on the fly when connect', function(done) {
    var roomId1 = randomRoomId();
    var roomId2 = randomRoomId();
    audioroomPlugin.connect(roomId1)
      .then(function() {
        return audioroomPlugin.connect(roomId2);
      })
      .then(function(response) {
        assert.equal(response['plugindata']['data']['audioroom'], 'roomchanged');
        done();
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
      Janus.webrtc.browserShim.attachMediaStream(audio, event.stream);
    });

    audioroomPlugin.connect(roomId)
      .then(function() {
        return audioroomPlugin.startMediaStreaming({muted: false});
      });
  });

  it('stops media on detach', function(done) {
    var roomId = randomRoomId();
    var pc;

    audioroomPlugin.connect(roomId)
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
        done();
      });
  });

});
