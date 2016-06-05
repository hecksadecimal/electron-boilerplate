var expect = require('chai').expect;
var testUtils = require('./utils');

describe('application launch', function () {

    beforeEach(testUtils.beforeEach);
    afterEach(testUtils.afterEach);

    it('shows hello world text on screen after launch', function () {
        return this.app.client.getText('#greet').then(function (text) {
            expect(text).to.equal('Hello World!');
        });
    });
});
