/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var DereferenceController = require('../../lib/controllers/DereferenceController');

var request = require('supertest'),
    DummyServer = require('./DummyServer');

describe('DereferenceController', function () {
  describe('The DereferenceController module', function () {
    it('should be a function', function () {
      DereferenceController.should.be.a('function');
    });

    it('should be a DereferenceController constructor', function () {
      new DereferenceController().should.be.an.instanceof(DereferenceController);
    });

    it('should create new DereferenceController objects', function () {
      DereferenceController().should.be.an.instanceof(DereferenceController);
    });
  });

  describe('A DereferenceController instance', function () {
    var controller, client;
    before(function () {
      controller = new DereferenceController({ dereference: { '/resource/': 'dbpedia/2014' } });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request for a dereferenced URL', function () {
      var response;
      before(function (done) {
        client.get('/resource/Mickey_Mouse')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should not hand over to the next controller', function () {
        controller.next.should.not.have.been.called;
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
      before(function (done) {
        client.get('/otherresource/Mickey_Mouse').end(done);
      });

      it('should hand over to the next controller', function () {
        controller.next.should.have.been.calledOnce;
      });
    });
  });
});
