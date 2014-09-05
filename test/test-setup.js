var Url = require('url');

// Set up the Chai assertion library
var chai = global.chai = require('chai'),
    should = global.should = chai.should(),
    expect = global.expect = chai.expect,
    test = global.test = {};

// Test helper for the extractQueryParams function of routers
test.extractQueryParams = function (description, url, intent, query, expectedQuery) {
  var router = this;
  it(description + ' ' + intent, function () {
    var result = router.extractQueryParams({ url: Url.parse(url, true) }, query);
    expect(result).to.equal(undefined, 'should not return anything');
    expect(query).to.deep.equal(expectedQuery, 'should match the expected query');
  });
};
