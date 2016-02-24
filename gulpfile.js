var gulp = require('gulp');
var rename = require("gulp-rename");
var browserify = require('gulp-browserify');

gulp.task('browserify', function() {
  gulp.src(['src/index.js'])
    .pipe(rename("janus.js"))
    .pipe(browserify())
    .pipe(gulp.dest('./dist'))
});

gulp.task('default', function() {
  gulp.run('browserify');

  gulp.watch("./src/*.js", function() {
    gulp.run('browserify');
  });
});
