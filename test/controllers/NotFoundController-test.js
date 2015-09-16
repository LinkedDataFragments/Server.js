var NotFoundController = require('../../lib/controllers/NotFoundController');

var request = require('supertest'),
    DummyServer = require('./DummyServer'),
    fs = require('fs');

describe('NotFoundController', function () {
  describe('The NotFoundController module', function () {
    it('should be a function', function () {
      NotFoundController.should.be.a('function');
    });

    it('should be a NotFoundController constructor', function () {
      new NotFoundController().should.be.an.instanceof(NotFoundController);
    });

    it('should create new NotFoundController objects', function () {
      NotFoundController().should.be.an.instanceof(NotFoundController);
    });
  });

  describe('A NotFoundController instance without writers', function () {
    var controller, client;
    before(function () {
      controller = new NotFoundController();
      client = request.agent(new DummyServer(controller));
    });

    it('should send a 404 in plaintext', function (done) {
      client.get('/notfound').expect(function (response) {
        controller.result.should.be.true;
        response.should.have.property('statusCode', 404);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', '/notfound not found');
      }).end(done);
    });
  });

  describe('A NotFoundController instance with 3 writers', function () {
    var controller, client, writerHtml, writerJson, writerTurtle;
    before(function () {
      writerHtml   = { writeNotFound: sinon.spy(function (stream) { stream.end(); }) };
      writerJson   = { writeNotFound: sinon.spy(function (stream) { stream.end(); }) };
      writerTurtle = { writeNotFound: sinon.spy(function (stream) { stream.end(); }) };
      controller = new NotFoundController({
       writers: {
          'application/json': writerJson,
          'text/turtle,text/n3': writerTurtle,
          'text/html,*/*': writerHtml,
        }
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      writerHtml.writeNotFound.reset();
      writerJson.writeNotFound.reset();
      writerTurtle.writeNotFound.reset();
    }

    describe('receiving a request without Accept header', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the default writer', function () {
        writerHtml.writeNotFound.should.have.been.calledOnce;
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of */*', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', '*/*')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the */* writer', function () {
        writerHtml.writeNotFound.should.have.been.calledOnce;
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', 'text/html')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the HTML writer', function () {
        writerHtml.writeNotFound.should.have.been.calledOnce;
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of application/json', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', 'application/json')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the JSON writer', function () {
        writerJson.writeNotFound.should.have.been.calledOnce;
      });

      it('should set the application/json content type', function () {
        response.headers.should.have.property('content-type', 'application/json;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', 'text/turtle')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the Turtle writer', function () {
        writerTurtle.writeNotFound.should.have.been.calledOnce;
      });

      it('should set the text/turtle content type', function () {
        response.headers.should.have.property('content-type', 'text/turtle;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/n3', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', 'text/n3')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the Turtle writer', function () {
        writerTurtle.writeNotFound.should.have.been.calledOnce;
      });

      it('should set the text/n3 content type', function () {
        response.headers.should.have.property('content-type', 'text/n3;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });
  });
});
