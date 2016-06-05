var Application = require('spectron').Application;

var getPathToApp = function () {
    var manifest = require('../app/package.json');
    switch (process.platform) {
        case "darwin":
            return 'tmp/' + manifest.productName + '.app/Contents/MacOS/' + manifest.productName;
        case "win32":
            return 'tmp/' + manifest.name + '/' + manifest.productName + '.exe';
        case "linux":
            return 'tmp/' + manifest.name + '/' + manifest.productName;
    }
};

exports.beforeEach = function () {
    this.app = new Application({
        path: getPathToApp()
    });
    return this.app.start();
};

exports.afterEach = function () {
    if (this.app && this.app.isRunning()) {
        return this.app.stop();
    }
};
