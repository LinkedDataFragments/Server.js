/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var TriplePatternFragmentsController = require('../../lib/controllers/TriplePatternFragmentsController');

var request = require('supertest'),
    DummyServer = require('./DummyServer'),
    http = require('http');

var TriplePatternFragmentsHtmlView = require('../../lib/views/triplepatternfragments/TriplePatternFragmentsHtmlView.js'),
    TriplePatternFragmentsRdfView  = require('../../lib/views/triplepatternfragments/TriplePatternFragmentsRdfView.js');

describe('TriplePatternFragmentsController', function () {
  describe('The TriplePatternFragmentsController module', function () {
    it('should be a function', function () {
      TriplePatternFragmentsController.should.be.a('function');
    });

    it('should be a TriplePatternFragmentsController constructor', function () {
      new TriplePatternFragmentsController().should.be.an.instanceof(TriplePatternFragmentsController);
    });

    it('should create new TriplePatternFragmentsController objects', function () {
      TriplePatternFragmentsController().should.be.an.instanceof(TriplePatternFragmentsController);
    });
  });

  describe('A TriplePatternFragmentsController instance with 3 routers', function () {
    var controller, client, routerA, routerB, routerC, datasource, datasources, view, prefixes;
    before(function () {
      routerA = { extractQueryParams: sinon.stub() };
      routerB = { extractQueryParams: sinon.stub().throws(new Error('second router error')) };
      routerC = {
        extractQueryParams: sinon.spy(function (request, query) {
          query.features.datasource = true;
          query.features.other = true;
          query.datasource = 'my-datasource';
          query.other = 'other';
        }),
      };
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({ stream: 'items' }),
      };
      datasources = { 'my-datasource': { title: 'My data', datasource: datasource } };
      view = new TriplePatternFragmentsRdfView(),
      sinon.spy(view, 'render');
      prefixes = { a: 'a' };
      controller = new TriplePatternFragmentsController({
        baseURL: 'https://example.org/base/?bar=foo',
        routers: [routerA, routerB, routerC],
        datasources: datasources,
        views: [view],
        prefixes: prefixes,
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      routerA.extractQueryParams.reset();
      routerB.extractQueryParams.reset();
      routerC.extractQueryParams.reset();
      datasource.supportsQuery.reset();
      datasource.select.reset();
    }

    describe('receiving a request for a fragment', function () {
      before(function (done) {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should call the first router with the request and an empty query', function () {
        routerA.extractQueryParams.should.have.been.calledOnce;

        var args = routerA.extractQueryParams.firstCall.args;
        expect(args[0]).to.have.property('url');
        expect(args[0].url).to.have.property('path', '/my-datasource?a=b&c=d');
        expect(args[0].url).to.have.property('pathname', '/my-datasource');
        expect(args[0].url).to.have.property('query');
        expect(args[0].url.query).to.deep.equal({ a: 'b', c: 'd' });

        expect(args[1]).to.be.an('object');
        expect(args[1]).to.have.property('features');
        expect(args[1].features).to.be.an('array');
      });

      it('should call the second router with the same request and query', function () {
        routerB.extractQueryParams.should.have.been.calledOnce;

        routerB.extractQueryParams.firstCall.args[0].should.equal(
          routerA.extractQueryParams.firstCall.args[0]);
        routerB.extractQueryParams.firstCall.args[1].should.equal(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should call the third router with the same request and query', function () {
        routerC.extractQueryParams.should.have.been.calledOnce;

        routerC.extractQueryParams.firstCall.args[0].should.equal(
          routerA.extractQueryParams.firstCall.args[0]);
        routerC.extractQueryParams.firstCall.args[1].should.equal(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should verify whether the data source supports the query', function () {
        var query = routerC.extractQueryParams.firstCall.args[1];
        datasource.supportsQuery.should.have.been.calledOnce;
        datasource.supportsQuery.should.have.been.calledWith(query);
      });

      it('should send the query to the right data source', function () {
        var query = routerC.extractQueryParams.firstCall.args[1];
        datasource.select.should.have.been.calledOnce;
        datasource.select.should.have.been.calledWith(query);
      });

      it('should pass the query result to the output view', function () {
        view.render.should.have.been.calledOnce;
        var args = view.render.firstCall.args;

        args[0].should.be.an('object'); // settings
        args[1].should.be.an.instanceof(http.IncomingMessage);
        args[2].should.be.an.instanceof(http.ServerResponse);
      });

      it('should pass the correct settings to the view', function () {
        view.render.should.have.been.calledOnce;
        var query = routerC.extractQueryParams.firstCall.args[1];
        var settings = view.render.firstCall.args[0];

        settings.should.deep.equal({
          datasource: {
            title: 'My data',
            index: 'https://example.org/#dataset',
            url: 'https://example.org/my-datasource#dataset',
            templateUrl: 'https://example.org/my-datasource{?subject,predicate,object}',
          },
          fragment: {
            url:             'https://example.org/my-datasource?a=b&c=d',
            pageUrl:         'https://example.org/my-datasource?a=b&c=d',
            firstPageUrl:    'https://example.org/my-datasource?a=b&c=d&page=1',
            nextPageUrl:     'https://example.org/my-datasource?a=b&c=d&page=2',
            previousPageUrl: null,
          },
          resultStream: {
            stream: 'items',
          },
          prefixes: prefixes,
          query: query,
          datasources: datasources,
        });
        query.should.have.property('patternString', '{ ?s ?p ?o }');
      });
    });

    describe('receiving a request for an unsupported fragment', function () {
      before(function (done) {
        resetAll();
        datasource.supportsQuery = sinon.stub().returns(false);
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should verify whether the data source supports the query', function () {
        var query = routerC.extractQueryParams.firstCall.args[1];
        datasource.supportsQuery.should.have.been.calledOnce;
        datasource.supportsQuery.should.have.been.calledWith(query);
      });

      it('should not send the query to the data source', function () {
        datasource.select.should.not.have.been.called;
      });
    });
  });

  describe('A TriplePatternFragmentsController instance with 2 views', function () {
    var controller, client, htmlView, rdfView;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({
          on: function (event, callback) {
            if (event === 'end' || event === 'metadata')
              setImmediate(callback, {});
          },
        }),
      };
      var router = {
        extractQueryParams: function (request, query) {
          query.features.datasource = true;
          query.datasource = 'my-datasource';
        },
      };
      htmlView = new TriplePatternFragmentsHtmlView();
      rdfView = new TriplePatternFragmentsRdfView();
      sinon.spy(htmlView, 'render');
      sinon.spy(rdfView, 'render');
      controller = new TriplePatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': { datasource: datasource } },
        views: [htmlView, rdfView],
      });
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
        client.get('/my-datasource')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the default view', function () {
        htmlView.render.should.have.been.calledOnce;
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
        client.get('/my-datasource').set('Accept', '*/*')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the HTML view', function () {
        htmlView.render.should.have.been.calledOnce;
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
        client.get('/my-datasource').set('Accept', 'text/html')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the HTML view', function () {
        htmlView.render.should.have.been.calledOnce;
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/turtle')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the Turtle view', function () {
        rdfView.render.should.have.been.calledOnce;
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
        client.get('/my-datasource').set('Accept', 'text/n3')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the Turtle view', function () {
        rdfView.render.should.have.been.calledOnce;
      });

      it('should set the text/n3 content type', function () {
        response.headers.should.have.property('content-type', 'text/n3;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });
  });

  describe('A TriplePatternFragmentsController instance without matching view', function () {
    var controller, client;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
      };
      var router = {
        extractQueryParams: function (request, query) {
          query.features.datasource = true;
          query.datasource = 'my-datasource';
        },
      };
      controller = new TriplePatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': { datasource: datasource } },
      });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request without Accept header', function () {
      var response;
      before(function (done) {
        client.get('/my-datasource')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should return status code 406', function () {
        response.should.have.property('statusCode', 406);
      });

      it('should set the text/plain content type', function () {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', function () {
      var response;
      before(function (done) {
        client.get('/my-datasource').set('Accept', 'text/html')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should return status code 406', function () {
        response.should.have.property('statusCode', 406);
      });

      it('should set the text/plain content type', function () {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });
  });

  describe('A TriplePatternFragmentsController instance with a datasource that synchronously errors', function () {
    var controller, client, router, datasource, error, view;
    before(function () {
      router = {
        extractQueryParams: sinon.spy(function (request, query) {
          query.features.datasource = true;
          query.datasource = 'my-datasource';
        }),
      };
      error = new Error('datasource error'),
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().throws(error),
      };
      view = new TriplePatternFragmentsRdfView(),
      controller = new TriplePatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { 'my-datasource': { datasource: datasource } },
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      router.extractQueryParams.reset();
    }

    describe('receiving a request for a fragment', function () {
      before(function (done) {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should emit the error', function () {
        expect(controller.error).to.equal(error);
      });
    });
  });

  describe('A TriplePatternFragmentsController instance with a datasource that asynchronously errors', function () {
    var controller, client, router, datasource, error, view;
    before(function () {
      router = {
        extractQueryParams: sinon.spy(function (request, query) {
          query.features.datasource = true;
          query.datasource = 'my-datasource';
        }),
      };
      error = new Error('datasource error'),
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: function (query, callback) { setImmediate(callback.bind(null, error)); },
      };
      view = new TriplePatternFragmentsRdfView(),
      view.render = sinon.stub(); // avoid writing a partial body
      controller = new TriplePatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { 'my-datasource': { datasource: datasource } },
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      router.extractQueryParams.reset();
    }

    describe('receiving a request for a fragment', function () {
      before(function (done) {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should emit the error', function () {
        expect(controller.error).to.equal(error);
      });
    });
  });
});
