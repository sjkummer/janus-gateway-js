var gulp = require('gulp');
var rename = require("gulp-rename");
var browserify = require('browserify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var log = require('fancy-log');
var exorcist = require('exorcist');

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

function build(cb) {
  browserifyTask();
  cb();
}

exports.build = build;
/*
 * Define default task that can be called by just running `gulp` from cli
 */
exports.default = build;
