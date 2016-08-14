/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var NotFoundController = require('../../lib/controllers/NotFoundController');

var request = require('supertest'),
    DummyServer = require('./DummyServer');

var NotFoundHtmlView = require('../../lib/views/notfound/NotFoundHtmlView.js'),
    NotFoundRdfView = require('../../lib/views/notfound/NotFoundRdfView.js');

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

  describe('A NotFoundController instance without views', function () {
    var controller, client;
    before(function () {
      controller = new NotFoundController();
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', function () {
      var response;
      before(function (done) {
        client.get('/notfound')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should not hand over to the next controller', function () {
        controller.next.should.not.have.been.called;
      });

      it('should have a 404 status', function () {
        response.should.have.property('statusCode', 404);
      });

      it('should set the text/plain content type', function () {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });

      it('should send a textual error body', function () {
        response.should.have.property('text', '/notfound not found\n');
      });
    });
  });

  describe('A NotFoundController instance with HTML and RDF views', function () {
    var controller, htmlView, rdfView, datasources, client;
    before(function () {
      htmlView = new NotFoundHtmlView();
      rdfView  = new NotFoundRdfView();
      sinon.spy(htmlView, 'render');
      sinon.spy(rdfView,  'render');
      datasources = { a: { title: 'foo', url: 'http://example.org/foo#dataset' } };
      controller = new NotFoundController({ views: [htmlView, rdfView], datasources: datasources });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      htmlView.render.reset();
      rdfView.render.reset();
    }

    describe('receiving a request without Accept header', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should not hand over to the next controller', function () {
        controller.next.should.not.have.been.called;
      });

      it('should call the HTML view', function () {
        htmlView.render.should.have.been.calledOnce;
      });

      it('should not call the RDF view', function () {
        rdfView.render.should.not.have.been.called;
      });

      it('should have a 404 status', function () {
        response.should.have.property('statusCode', 404);
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });

      it('should send an HTML error body', function () {
        response.text.should.contain('No resource with URL <code>/notfound</code> was found.');
      });
    });

    describe('receiving a request with an Accept header of */*', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', '*/*')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should not hand over to the next controller', function () {
        controller.next.should.not.have.been.called;
      });

      it('should call the HTML view', function () {
        htmlView.render.should.have.been.calledOnce;
      });

      it('should not call the RDF view', function () {
        rdfView.render.should.not.have.been.called;
      });

      it('should have a 404 status', function () {
        response.should.have.property('statusCode', 404);
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });

      it('should send an HTML error body', function () {
        response.text.should.contain('No resource with URL <code>/notfound</code> was found.');
      });
    });

    describe('receiving a request with an Accept header of text/html', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', 'text/html')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should not hand over to the next controller', function () {
        controller.next.should.not.have.been.called;
      });

      it('should call the HTML view', function () {
        htmlView.render.should.have.been.calledOnce;
      });

      it('should not call the RDF view', function () {
        rdfView.render.should.not.have.been.called;
      });

      it('should have a 404 status', function () {
        response.should.have.property('statusCode', 404);
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });

      it('should send an HTML error body', function () {
        response.text.should.contain('No resource with URL <code>/notfound</code> was found.');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', 'text/turtle')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should not hand over to the next controller', function () {
        controller.next.should.not.have.been.called;
      });

      it('should call the RDF view', function () {
        rdfView.render.should.have.been.calledOnce;
      });

      it('should not call the HTML view', function () {
        htmlView.render.should.not.have.been.called;
      });

      it('should have a 404 status', function () {
        response.should.have.property('statusCode', 404);
      });

      it('should set the text/turtle content type', function () {
        response.headers.should.have.property('content-type', 'text/turtle;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });

      it('should send a Turtle error body', function () {
        response.text.should.contain('<http://example.org/foo#dataset> a <http://rdfs.org/ns/void#Dataset>');
        response.text.should.not.contain('<#metadata> <http://xmlns.com/foaf/0.1/primaryTopic> <>.');
      });
    });

    describe('receiving a request with an Accept header of application/trig', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/notfound').set('Accept', 'application/trig')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should not hand over to the next controller', function () {
        controller.next.should.not.have.been.called;
      });

      it('should call the RDF view', function () {
        rdfView.render.should.have.been.calledOnce;
      });

      it('should not call the HTML view', function () {
        htmlView.render.should.not.have.been.called;
      });

      it('should have a 404 status', function () {
        response.should.have.property('statusCode', 404);
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'application/trig;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });

      it('should send a TriG error body', function () {
        response.text.should.contain('<http://example.org/foo#dataset> a <http://rdfs.org/ns/void#Dataset>');
        response.text.should.contain('<#metadata> <http://xmlns.com/foaf/0.1/primaryTopic> <>.');
      });
    });
  });
});
