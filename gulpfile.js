var gulp = require('gulp'),
	babelify = require('babelify'),
	connect = require('gulp-connect'),
	watch = require('gulp-watch'),
	scss = require('gulp-sass'),
	browserify = require("browserify"),
	rename = require("gulp-rename"),
	minify = require("gulp-minify"),
	uglify = require("gulp-uglify");

var source = require('vinyl-source-stream');

const paths = {
	entry: "./src/Main.js",
	dist: "./dist/",
	sourceFiles: "./src/**/*.js",
	sourcemaps: ".",
	testConfig: `${__dirname}/test/karma.conf.js`
};


gulp.task('server', function () {
	connect.server({
		root: 'dist',
		livereload: true
	});
});

gulp.task('browserify:debug', function () {
	return browserify({entries: './src/Main.js', extensions: ['.js'], debug: true, insertGlobals: true})
		.transform("babelify", {presets: ["es2015"]})
		.bundle()
		.pipe(source('app.js'))
		.pipe(gulp.dest('dist/js'));
});

gulp.task('browserify:release', function () {
	gulp.src('./src/main.js')
		.pipe(browserify({
			insertGlobals: true,
			debug: false
		}))
		.pipe(uglify({
			mangle: true,
			compress: true
		}))
		.pipe(rename("app.js"))
		.pipe(gulp.dest('./release/js'), {overwrite: true})
});

gulp.task("watch", function () {
	// only rebundle the global module for testing
	gulp.watch(paths.sourceFiles, ["browserify:debug"]);
});