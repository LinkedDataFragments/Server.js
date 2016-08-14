/*! @license MIT ©2013-2016 Ruben Verborgh - Ghent University / iMinds */

var URL = require('url'),
    Readable = require('stream').Readable,
    Writable = require('stream').Writable;

// Set up the sinon stubbing library
global.sinon = require('sinon');

// Set up the Chai assertion library
var chai = require('chai');
global.test = {};
global.expect = chai.expect;
global.should = chai.should();
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

// Creates an in-memory stream
test.createStreamCapture = function () {
  var stream = new Writable({ objectMode: true });
  stream.buffer = '';
  stream._write = function (chunk, encoding, callback) {
    this.buffer += chunk;
    callback && callback();
  };
  return stream;
};

// Creates a readable stream from an array
test.streamFromArray = function (items) {
  var stream = new Readable({ objectMode: true });
  stream._read = function () {
    var item = items.shift();
    this.push(item || null);
  };
  return stream;
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
