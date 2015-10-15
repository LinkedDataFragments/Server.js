var gulp = require('gulp'),
    chug = require('gulp-chug');

// Copy required dist files from sub-modules
gulp.task('rdf2html-assets', function() {
  return gulp.src('./node_modules/rdf2html/gulpfile.js')
      .pipe(chug({ tasks: ['dist'] }))
      .on('end', function() {
        return gulp.src('node_modules/rdf2html/dist/**')
            .pipe(gulp.dest('./assets/'));
      });
});
