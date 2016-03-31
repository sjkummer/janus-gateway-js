var gulp = require('gulp');
var rename = require("gulp-rename");
var browserify = require('browserify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var exorcist = require('exorcist');

gulp.task('browserify', function() {
  var b = browserify({
    entries: './src/browser.js',
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
    .on('error', gutil.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('default', function() {
  gulp.run('browserify');

  gulp.watch("./src/*.js", function() {
    gulp.run('browserify');
  });
});
