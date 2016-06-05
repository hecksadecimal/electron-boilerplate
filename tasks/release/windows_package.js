'use strict';

var Q = require('q');
var gulpUtil = require('gulp-util');
var childProcess = require('child_process');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('../utils');

var projectDir;
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

var cleanupRuntime = function () {
    return readyAppDir.removeAsync('resources/default_app');
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
    var deferred = Q.defer();

    projectDir.copy('resources/windows/icon.ico', readyAppDir.path('icon.ico'));

    // Replace Electron icon for your own.
    var rcedit = require('rcedit');
    rcedit(readyAppDir.path('electron.exe'), {
        'icon': projectDir.path('resources/windows/icon.ico'),
        'version-string': {
            'ProductName': manifest.productName,
            'FileDescription': manifest.description,
            'ProductVersion': manifest.version,
            'CompanyName': manifest.author, // it might be better to add another field to package.json for this
            'LegalCopyright': manifest.copyright,
            'OriginalFilename': manifest.productName + '.exe'
        }
    }, function (err) {
        if (!err) {
            deferred.resolve();
        }
    });

    return deferred.promise;
};

var renameApp = function () {
    return readyAppDir.renameAsync('electron.exe', manifest.productName + '.exe');
};

module.exports = function () {
    return init()
        .then(copyRuntime)
        .then(cleanupRuntime)
        .then(packageBuiltApp)
        .then(finalize)
        .then(renameApp)
        .catch(console.error);
};
