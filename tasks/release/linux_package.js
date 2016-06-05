'use strict';

var Q = require('q');
var gulpUtil = require('gulp-util');
var childProcess = require('child_process');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('../utils');

var projectDir;
var packName;
var packDir;
var tmpDir;
var readyAppDir;
var manifest;

var init = function () {
    projectDir = jetpack;
    tmpDir = projectDir.dir('./tmp', { empty: true });
    manifest = projectDir.read('app/package.json', 'json');
    packName = utils.getReleasePackageName(manifest);
    packDir = tmpDir.dir(packName);
    readyAppDir = packDir.cwd('opt', manifest.name);

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

var finalize = function () {
    // Create .desktop file from the template
    var desktop = projectDir.read('resources/linux/app.desktop');
    desktop = utils.replace(desktop, {
        name: manifest.name,
        productName: manifest.productName,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author
    });
    packDir.write('usr/share/applications/' + manifest.name + '.desktop', desktop);

    // Copy icon
    projectDir.copy('resources/icon.png', readyAppDir.path('icon.png'));

    return new Q();
};

var renameApp = function () {
    return readyAppDir.renameAsync('electron', manifest.name);
};

module.exports = function () {
    return init()
        .then(copyRuntime)
        .then(packageBuiltApp)
        .then(finalize)
        .then(renameApp)
        .catch(console.error);
};
