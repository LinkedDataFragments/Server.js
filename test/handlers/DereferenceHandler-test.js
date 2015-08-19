var DereferenceHandler = require('../../lib/handlers/DereferenceHandler');

var request = require('supertest'),
    DummyServer = require('./DummyServer');

describe('DereferenceHandler', function () {
  describe('A DereferenceHandler instance', function () {
    var handler, client;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
      };
      var router = { extractQueryParams: function (request, query) {
        query.features.datasource = true;
        query.datasource = request.url.pathname.substr(1);
      }};
      handler = new DereferenceHandler({ dereference: { '/resource/': 'dbpedia/2014' } });
      client = request.agent(new DummyServer(handler));
    });

    describe('receiving a request for a dereferenced URL', function () {
      var response;
      before(function (done) {
        client.get('/resource/Mickey_Mouse')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should return true', function () {
        handler.result.should.be.true;
      });

      it('should set the status code to 303', function () {
        response.should.have.property('statusCode', 303);
      });

      it('should set the text/plain content type', function () {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should set the Location header correctly', function () {
        var hostname = response.req.getHeader('Host'),
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        response.headers.should.have.property('location', expectedLocation);
      });

      it('should mention the desired location in the body', function () {
        var hostname = response.req.getHeader('Host'),
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        response.text.should.contain(expectedLocation);
      });
    });

    describe('receiving a request for a non-defererenced URL', function () {
      var response;
      before(function (done) {
        client.get('/otherresource/Mickey_Mouse')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should return false', function () {
        handler.result.should.be.false;
      });
    });
  });
});
