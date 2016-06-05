'use strict';

var gulp = require('gulp');
var utils = require('../utils');

var packageForOs = {
    osx: require('./osx_package'),
    linux: require('./linux'),
    windows: require('./windows'),
};

var releaseForOs = {
    osx: require('./osx_release'),
    linux: require('./linux'),
    windows: require('./windows'),
};

gulp.task('package', ['build'], function () {
    return packageForOs[utils.os()]();
});

gulp.task('release', ['package'], function () {
    return releaseForOs[utils.os()]();
});
