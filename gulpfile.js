var fs = require('fs');
var path = require('path');

var gulp = require('gulp');

// Load all gulp plugins automatically
// and attach them to the `plugins` object
var plugins = require('gulp-load-plugins')();

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

var pkg = require('./package.json');
var dirs = pkg['dev-configs'].directories;


// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

// archive
gulp.task('archive:create_archive_dir', function() {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', function(done) {

    var archiveName = path.resolve(dirs.archive, pkg.name + '_v' + pkg.version + '.zip');
    var archiver = require('archiver')('zip');
    var files = require('glob').sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    var output = fs.createWriteStream(archiveName);

    archiver.on('error', function(error) {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach(function(file) {

        var filePath = path.resolve(dirs.dist, file);

        // `archiver.bulk` does not maintain the file
        // permissions, so we need to add files individually
        archiver.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath)
        });

    });

    archiver.pipe(output);
    archiver.finalize();

});


// clean
gulp.task('clean', function(done) {
    require('del')([
        dirs.archive,
        dirs.dist + '/**/*',
        dirs.dist + '/.*'
    ], done);
});


// copy
gulp.task('copy', [
    'copy:vendor',
    'copy:css',
    'copy:misc'
]);

gulp.task('copy:vendor', ['copy:.htaccess', 'copy:jquery', 'copy:normalize']);

gulp.task('copy:.htaccess', function() {
    return gulp.src('node_modules/apache-server-configs/dist/.htaccess')
               .pipe(plugins.replace(/# ErrorDocument/g, 'ErrorDocument'))
               .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:jquery', function() {
    return gulp.src(['node_modules/jquery/dist/jquery.min.js'])
               .pipe(gulp.dest(dirs.dist + '/js/vendor'));
});

gulp.task('copy:normalize', function() {
    return gulp.src('node_modules/normalize.css/normalize.css')
        .pipe(gulp.dest(dirs.dist + '/css'));
});

gulp.task('copy:css', function() {
    return gulp.src(dirs.src + '/css/**/*')
        .pipe(plugins.autoprefixer({
            browsers: ['last 2 versions', 'ie >= 8', '> 1%'],
            cascade: false
        }))
        .pipe(gulp.dest(dirs.dist + '/css'));
});

gulp.task('copy:misc', function() {
    return gulp.src([
        'LICENSE.txt',
        dirs.src + '/**/*',
        '!' + dirs.src + '/doc', '!' + dirs.src + '/doc/**/*',
        '!' + dirs.src + '/css', '!' + dirs.src + '/css/**/*',
    ]).pipe(gulp.dest(dirs.dist));
});


// lintjs
gulp.task('lint:js', function() {
    return gulp.src([
        'gulpfile.js',
        dirs.src + '/js/app/**/*.js',
    ]).pipe(plugins.jscs())
        .pipe(plugins.jscs.reporter())
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jshint.reporter());

});


// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('archive', function(done) {
    runSequence(
        'lint:js',
        'clean',
        'copy',
        'archive:create_archive_dir',
        'archive:zip',
    done);
});

gulp.task('build', function(done) {
    runSequence(
        ['clean', 'lint:js'],
        'copy',
        done);
});

gulp.task('default', ['build']);
