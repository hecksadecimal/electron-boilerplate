'use strict';

var gulp = require('gulp');
var utils = require('../utils');

var packageForOs = {
    osx: require('./osx_package'),
    linux: require('./linux_package'),
    windows: require('./windows_package'),
};

var releaseForOs = {
    osx: require('./osx_release'),
    linux: require('./linux_release'),
    windows: require('./windows_release'),
};

gulp.task('package', ['build'], function () {
    return packageForOs[utils.os()]();
});

gulp.task('release', ['package'], function () {
    return releaseForOs[utils.os()]();
});
