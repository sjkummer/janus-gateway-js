var gulp = require('gulp');
var rename = require("gulp-rename");
var browserify = require('browserify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var log = require('fancy-log');
var exorcist = require('exorcist');
var nodeResolve = require('resolve');

var browserifyTask = function() {
  var b = browserify({
    entries: './src/index.js',
    standalone: 'Janus',
    debug: true
  });

  return b.bundle()
    .pipe(exorcist('./dist/janus.js.map'))
    .pipe(source('janus.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(rename('janus.min.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .on('error', log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist'));
};

var vendorTask = function(external) {
  var b = browserify();
  if (external) {
    if (!_.isArray(external)) {
      external = [external];
    }
    external.forEach(function(id) {
      b.require(nodeResolve.sync(id), {expose: id});
    });

    var stream = b
      .bundle()
      .on('error', function(err) {
        console.log(err.message);
        this.emit('end');
      })
      .pipe(source('vendor.js'));

    stream
      .pipe(gulp.dest('./dist'))
      .pipe(rename('vendor.min.js'))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(gulp.dest('./dist'));

    return stream;
  }
};


function build(cb) {
  vendorTask();
  browserifyTask();
  cb();
}

exports.build = build;
/*
 * Define default task that can be called by just running `gulp` from cli
 */
exports.default = build;
