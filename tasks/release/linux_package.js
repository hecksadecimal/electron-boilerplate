'use strict';

var Q = require('q');
var gulpUtil = require('gulp-util');
var childProcess = require('child_process');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('../utils');

var projectDir;
var packDir;
var tmpDir;
var readyAppDir;
var manifest;

var init = function () {
    projectDir = jetpack;
    tmpDir = projectDir.dir('./tmp', { empty: true });
    manifest = projectDir.read('app/package.json', 'json');
    readyAppDir = tmpDir.cwd(manifest.name);

    return new Q();
};

var copyRuntime = function () {
    return projectDir.copyAsync('node_modules/electron-prebuilt/dist', readyAppDir.path(), { overwrite: true });
};

var packageBuiltApp = function () {
    var deferred = Q.defer();

    asar.createPackageWithOptions(projectDir.path('build'), readyAppDir.path('resources/app.asar'), {
        dot: true
    }, function () {
        deferred.resolve();
    });

    return deferred.promise;
};

var renameApp = function () {
    return readyAppDir.renameAsync('electron', manifest.name);
};

module.exports = function () {
    return init()
        .then(copyRuntime)
        .then(packageBuiltApp)
        .then(renameApp)
        .catch(console.error);
};
