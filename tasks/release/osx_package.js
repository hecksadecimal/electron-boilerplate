'use strict';

var Q = require('q');
var gulpUtil = require('gulp-util');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('../utils');
var child_process = require('child_process');

var projectDir;
var tmpDir;
var finalAppDir;
var manifest;

var init = function () {
    projectDir = jetpack;
    tmpDir = projectDir.dir('./tmp', { empty: true });
    manifest = projectDir.read('app/package.json', 'json');
    finalAppDir = tmpDir.cwd(manifest.productName + '.app');

    return new Q();
};

var copyRuntime = function () {
    return projectDir.copyAsync('node_modules/electron-prebuilt/dist/Electron.app', finalAppDir.path());
};

var cleanupRuntime = function () {
    finalAppDir.remove('Contents/Resources/default_app');
    finalAppDir.remove('Contents/Resources/atom.icns');
    return new Q();
};

var packageBuiltApp = function () {
    var deferred = Q.defer();

    asar.createPackageWithOptions(projectDir.path('build'), finalAppDir.path('Contents/Resources/app.asar'), {
        dot: true
    }, function () {
        deferred.resolve();
    });

    return deferred.promise;
};

var finalize = function () {
    // Prepare main Info.plist
    var info = projectDir.read('resources/osx/Info.plist');
    info = utils.replace(info, {
        productName: manifest.productName,
        identifier: manifest.osx.identifier,
        version: manifest.version,
        build: manifest.osx.build,
        copyright: manifest.copyright,
        LSApplicationCategoryType: manifest.osx.LSApplicationCategoryType
    });
    finalAppDir.write('Contents/Info.plist', info);

    // Prepare Info.plist of Helper apps
    [' EH', ' NP', ''].forEach(function (helper_suffix) {
        info = projectDir.read('resources/osx/helper_apps/Info' + helper_suffix + '.plist');
        info = utils.replace(info, {
            productName: manifest.productName,
            identifier: manifest.identifier
        });
        finalAppDir.write('Contents/Frameworks/Electron Helper' + helper_suffix + '.app/Contents/Info.plist', info);
    });

    // Copy icon
    projectDir.copy('resources/osx/icon.icns', finalAppDir.path('Contents/Resources/icon.icns'));

    return new Q();
};

var renameApp = function () {
    // Rename helpers
    [' Helper EH', ' Helper NP', ' Helper'].forEach(function (helper_suffix) {
        finalAppDir.rename('Contents/Frameworks/Electron' + helper_suffix + '.app/Contents/MacOS/Electron' + helper_suffix, manifest.productName + helper_suffix );
        finalAppDir.rename('Contents/Frameworks/Electron' + helper_suffix + '.app', manifest.productName + helper_suffix + '.app');
    });
    // Rename application
    finalAppDir.rename('Contents/MacOS/Electron', manifest.productName);
    return new Q();
};

var cleanClutter = function () {
    return tmpDir.removeAsync('.');
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
