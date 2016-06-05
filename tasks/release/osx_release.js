'use strict';

var Q = require('q');
var gulpUtil = require('gulp-util');
var jetpack = require('fs-jetpack');
var asar = require('asar');
var utils = require('../utils');
var child_process = require('child_process');

var projectDir;
var releasesDir;
var tmpDir;
var finalAppDir;
var manifest;

var init = function () {
    projectDir = jetpack;
    tmpDir = projectDir.dir('./tmp');
    releasesDir = projectDir.dir('./releases');
    manifest = projectDir.read('app/package.json', 'json');
    finalAppDir = tmpDir.cwd(manifest.productName + '.app');

    return new Q();
};

var signApp = function () {
    var identity = utils.getSigningId(manifest);
    var MASIdentity = utils.getMASSigningId(manifest);
    var MASInstallerIdentity = utils.getMASInstallerSigningId(manifest);

    if (utils.releaseForMAS()) {
        if (!MASIdentity || !MASInstallerIdentity) {
            gulpUtil.log('--mas-sign and --mas-installer-sign are required to release for Mac App Store!');
            process.exit(0);
        }
        var cmds = [
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries/libnode.dylib"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/Electron Framework.framework/Versions/A"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/' + manifest.productName + ' Helper.app/"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/' + manifest.productName + ' Helper EH.app/"',
            'codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist -v "' + finalAppDir.path() + '/Contents/Frameworks/' + manifest.productName + ' Helper NP.app/"'
        ];

        if (finalAppDir.exists('Contents/Frameworks/Squirrel.framework/Versions/A')) {
            // # Signing a non-MAS build.
            cmds.push('codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist "' + finalAppDir.path() + '/Contents/Frameworks/Mantle.framework/Versions/A"');
            cmds.push('codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist "' + finalAppDir.path() + '/Contents/Frameworks/ReactiveCocoa.framework/Versions/A"');
            cmds.push('codesign --deep -f -s "' + MASIdentity + '" --entitlements resources/osx/child.plist "' + finalAppDir.path() + '/Contents/Frameworks/Squirrel.framework/Versions/A"');
        }

        cmds.push('codesign -f -s "' + MASIdentity + '" --entitlements resources/osx/parent.plist -v "' + finalAppDir.path() + '"');

        cmds.push('productbuild --component "' + finalAppDir.path() + '" /Applications --sign "' + MASInstallerIdentity + '" "' + releasesDir.path(manifest.productName + '.pkg') + '"');

        var result = new Q();
        cmds.forEach(function (cmd) {
            result = result.then(function(result) {
                gulpUtil.log('Signing with:', cmd);
                return Q.nfcall(child_process.exec, cmd);
            });
        });
        result = result.then(function(result) {
            return new Q();
        });
        return result;

    } else if (identity) {
        var cmd = 'codesign --deep --force --sign "' + identity + '" "' + finalAppDir.path() + '"';
        gulpUtil.log('Signing with:', cmd);
        return Q.nfcall(child_process.exec, cmd);
    } else {
        return new Q();
    }
};

var packToDmgFile = function () {
    if (utils.releaseForMAS()) {
        return new Q();
    }

    var deferred = Q.defer();

    var appdmg = require('appdmg');
    var dmgName = utils.getReleasePackageName(manifest) + '.dmg';

    // Prepare appdmg config
    var dmgManifest = projectDir.read('resources/osx/appdmg.json');
    dmgManifest = utils.replace(dmgManifest, {
        productName: manifest.productName,
        appPath: finalAppDir.path(),
        dmgIcon: projectDir.path("resources/osx/dmg-icon.icns"),
        dmgBackground: projectDir.path("resources/osx/dmg-background.png")
    });
    tmpDir.write('appdmg.json', dmgManifest);

    // Delete DMG file with this name if already exists
    releasesDir.remove(dmgName);

    gulpUtil.log('Packaging to DMG file... (' + dmgName + ')');

    var readyDmgPath = releasesDir.path(dmgName);
    appdmg({
        source: tmpDir.path('appdmg.json'),
        target: readyDmgPath
    })
    .on('error', function (err) {
        console.error(err);
    })
    .on('finish', function () {
        gulpUtil.log('DMG file ready!', readyDmgPath);
        deferred.resolve();
    });

    return deferred.promise;
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
        .then(signApp)
        .then(packToDmgFile)
        .then(cleanClutter)
        .catch(console.error);
};
