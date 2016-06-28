var Timer = require('../../src/timer');

describe('Timer tests', function() {

  this.timeout(1000);

  it('executes timer after start', function(done) {
    var timer = new Timer(done, 300);
    timer.start();
  });

  it('does not execute timer after stop', function(done) {
    setTimeout(done, 500);
    var timer = new Timer(function() {
      done(new Error('Unreachable point'));
    }, 300);
    timer.start();
    timer.stop();
  });

  it('executes timer after reset', function(done) {
    var timer = new Timer(done, 300);
    timer.reset();
  });
});
