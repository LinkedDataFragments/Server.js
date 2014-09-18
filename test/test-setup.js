var URL = require('url'),
    Readable = require('stream').Readable;

// Set up the sinon stubbing library
var sinon = global.sinon = require('sinon');

// Set up the Chai assertion library
var chai = global.chai = require('chai'),
    should = global.should = chai.should(),
    expect = global.expect = chai.expect,
    test = global.test = {};
chai.use(require('sinon-chai'));

// Test helper for the extractQueryParams function of routers
test.extractQueryParams = function (description, url, intent, query, expectedQuery) {
  var router = this;
  it(description + ' ' + intent, function () {
    var result = router.extractQueryParams({ url: URL.parse(url, true) }, query);
    expect(result).to.equal(undefined, 'should not return anything');
    expect(query).to.deep.equal(expectedQuery, 'should match the expected query');
  });
};

// Creates a dummy HTTP response
test.createHttpResponse = function (contents, contentType) {
  var response = new Readable();
  response._read = function () {};
  response.statusCode = 200;
  response.headers = { 'content-type': contentType };
  response.abort = function () { response.aborted = true; };
  setImmediate(function () { response.push(contents); response.push(null); });
  return response;
};

chai.use(function (chai, utils) {
  // Checks whether the stream contains the given number of elements
  chai.Assertion.addMethod('streamWithLength', function (expectedLength, callback) {
    var stream = utils.flag(this, 'object'), length = 0, self = this;
    stream.on('data', function () { length++; });
    stream.on('end', function () {
      self.assert(length === expectedLength,
        'expected #{this} to be a stream of length ' + expectedLength + ', was ' + length,
        'expected #{this} not to be a stream of length ' + expectedLength);
      callback();
    });
  });
});
