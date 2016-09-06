var _ = require('underscore');
var gulp = require('gulp-param')(require('gulp'), process.argv);
var rename = require("gulp-rename");
var browserify = require('browserify');

var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var exorcist = require('exorcist');
var nodeResolve = require('resolve');

var browserifyTask = function(global, external) {
  var b = browserify({
    entries: './src/index.js',
    standalone: 'Janus',
    debug: true
  });

  if (external) {
    if (!_.isArray(external)) {
      external = [external];
    }
    external.forEach(function(lib) {
      b.external(lib);
    });
  }
  if (_.isObject(global)) {
    b.transform('exposify', {expose: global});
  }

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
};

gulp.task('browserify', browserifyTask);

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

gulp.task('vendor', vendorTask);

var buildTask = function(global, external) {
  vendorTask(external);
  browserifyTask(global, external);
};

gulp.task('default', function(global, external) {
  buildTask(global, external);
});
