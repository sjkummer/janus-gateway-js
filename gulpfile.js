var gulp = require('gulp');
var rename = require("gulp-rename");
var browserify = require('browserify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var exorcist = require('exorcist');
var nodeResolve = require('resolve');

var vendor = [
  'bluebird'
];

gulp.task('browserify', function() {
  var b = browserify({
    entries: './src/browser.js',
    debug: true
  });

  vendor.forEach(function(lib) {
    b.external(lib);
  });

  return b.bundle()
    .pipe(exorcist('./dist/janus.js.map'))
    .pipe(source('janus.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(rename('janus.min.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .on('error', gutil.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('vendor', function() {
  var b = browserify();

  vendor.forEach(function(id) {
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
});

gulp.task('default', function() {
  gulp.run(['browserify', 'vendor']);

  gulp.watch("./src/*.js", function() {
    gulp.run('browserify');
  });
});
