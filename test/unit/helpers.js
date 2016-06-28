var assert = require('chai').assert;
var Helpers = require('../../src/helpers');

describe('Helpers tests', function() {

  it('`extend` works', function() {
    var result;
    assert.equal(Helpers.extend({}, {a: 'b'}).a, 'b', 'can extend an object with the attributes of another');
    assert.equal(Helpers.extend({a: 'x'}, {a: 'b'}).a, 'b', 'properties in source override destination');
    assert.equal(Helpers.extend({x: 'x'}, {a: 'b'}).x, 'x', "properties not in source don't get overriden");
    result = Helpers.extend({x: 'x'}, {a: 'a'}, {b: 'b'});
    assert.deepEqual(result, {x: 'x', a: 'a', b: 'b'}, 'can extend from multiple source objects');
    result = Helpers.extend({x: 'x'}, {a: 'a', x: 2}, {a: 'b'});
    assert.deepEqual(result, {x: 2, a: 'b'}, 'extending from multiple source objects last property trumps');
    result = Helpers.extend({}, {a: void 0, b: null});
    assert.deepEqual(Object.keys(result), ['a', 'b'], 'extend copies undefined values');

  });

  it('`inherits` works', function(done) {
    var A = function() {
    };
    A.prototype.hello = function() {
      done();
    };

    var B = function() {
    };

    Helpers.inherits(B, A);
    assert.strictEqual(B.super_, A);

    var b = new B();
    b.hello();
  });
});
