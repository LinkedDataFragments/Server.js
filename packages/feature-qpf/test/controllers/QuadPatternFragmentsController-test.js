/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let QuadPatternFragmentsController = require('../../').controllers.QuadPatternFragmentsController;

let request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer'),
    http = require('http');

let QuadPatternFragmentsHtmlView = require('../../').views.quadpatternfragments.QuadPatternFragmentsHtmlView,
    QuadPatternFragmentsRdfView  = require('../../').views.quadpatternfragments.QuadPatternFragmentsRdfView,
    UrlData                      = require('@ldf/core').UrlData;

describe('QuadPatternFragmentsController', () => {
  describe('The QuadPatternFragmentsController module', () => {
    it('should be a function', () => {
      QuadPatternFragmentsController.should.be.a('function');
    });

    it('should be a QuadPatternFragmentsController constructor', () => {
      new QuadPatternFragmentsController().should.be.an.instanceof(QuadPatternFragmentsController);
    });
  });

  describe('A QuadPatternFragmentsController instance with 3 routers', () => {
    let controller, client, routerA, routerB, routerC, datasource, datasources, view, prefixes;
    before(() => {
      routerA = { extractQueryParams: sinon.stub() };
      routerB = { extractQueryParams: sinon.stub().throws(new Error('second router error')) };
      routerC = {
        extractQueryParams: sinon.spy((request, query) => {
          query.features.datasource = true;
          query.features.other = true;
          query.datasource = '/my-datasource';
          query.other = 'other';
        }),
      };
      datasource = {
        title: 'My data',
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({ stream: 'items' }),
        supportedFeatures: { quadPattern: true },
      };
      datasources = { 'my-datasource': datasource };
      view = new QuadPatternFragmentsRdfView(),
      sinon.spy(view, 'render');
      prefixes = { a: 'a' };
      controller = new QuadPatternFragmentsController({
        urlData: new UrlData({ baseURL: 'https://example.org/base/?bar=foo' }),
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

    describe('receiving a request for a fragment', () => {
      before((done) => {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should call the first router with the request and an empty query', () => {
        routerA.extractQueryParams.should.have.been.calledOnce;

        let args = routerA.extractQueryParams.firstCall.args;
        expect(args[0]).to.have.property('url');
        expect(args[0].url).to.have.property('path', '/my-datasource?a=b&c=d');
        expect(args[0].url).to.have.property('pathname', '/my-datasource');
        expect(args[0].url).to.have.property('query');
        expect(args[0].url.query).to.deep.equal({ a: 'b', c: 'd' });

        expect(args[1]).to.be.an('object');
        expect(args[1]).to.have.property('features');
        expect(args[1].features).to.be.an('array');
      });

      it('should call the second router with the same request and query', () => {
        routerB.extractQueryParams.should.have.been.calledOnce;

        routerB.extractQueryParams.firstCall.args[0].should.equal(
          routerA.extractQueryParams.firstCall.args[0]);
        routerB.extractQueryParams.firstCall.args[1].should.equal(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should call the third router with the same request and query', () => {
        routerC.extractQueryParams.should.have.been.calledOnce;

        routerC.extractQueryParams.firstCall.args[0].should.equal(
          routerA.extractQueryParams.firstCall.args[0]);
        routerC.extractQueryParams.firstCall.args[1].should.equal(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        datasource.supportsQuery.should.have.been.calledOnce;
        datasource.supportsQuery.should.have.been.calledWith(query);
      });

      it('should send the query to the right data source', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        datasource.select.should.have.been.calledOnce;
        datasource.select.should.have.been.calledWith(query);
      });

      it('should pass the query result to the output view', () => {
        view.render.should.have.been.calledOnce;
        let args = view.render.firstCall.args;

        args[0].should.be.an('object'); // settings
        args[1].should.be.an.instanceof(http.IncomingMessage);
        args[2].should.be.an.instanceof(http.ServerResponse);
      });

      it('should pass the correct settings to the view', () => {
        view.render.should.have.been.calledOnce;
        let query = routerC.extractQueryParams.firstCall.args[1];
        let settings = view.render.firstCall.args[0];

        settings.datasource.should.have.property('title', 'My data');
        settings.datasource.should.have.property('index', 'https://example.org/#dataset');
        settings.datasource.should.have.property('url', 'https://example.org/my-datasource#dataset');
        settings.datasource.should.have.property('templateUrl', 'https://example.org/my-datasource{?subject,predicate,object,graph}');
        settings.datasource.should.have.property('supportsQuads', true);
        settings.fragment.should.deep.equal({
          url:             'https://example.org/my-datasource?a=b&c=d',
          pageUrl:         'https://example.org/my-datasource?a=b&c=d',
          firstPageUrl:    'https://example.org/my-datasource?a=b&c=d&page=1',
          nextPageUrl:     'https://example.org/my-datasource?a=b&c=d&page=2',
          previousPageUrl: null,
        });
        settings.results.should.deep.equal({
          stream: 'items',
        });
        settings.prefixes.should.deep.equal(prefixes);
        settings.query.should.deep.equal(query);
        settings.datasources.should.deep.equal({ '/my-datasource': datasource });
        query.should.have.property('patternString', '{ ?s ?p ?o ?g. }');
      });
    });

    describe('receiving a request for an unsupported fragment', () => {
      before((done) => {
        resetAll();
        datasource.supportsQuery = sinon.stub().returns(false);
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        datasource.supportsQuery.should.have.been.calledOnce;
        datasource.supportsQuery.should.have.been.calledWith(query);
      });

      it('should not send the query to the data source', () => {
        datasource.select.should.not.have.been.called;
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with 2 views', () => {
    let controller, client, htmlView, rdfView;
    before(() => {
      let datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({
          on: function (event, callback) {
            if (event === 'end' || event === 'metadata')
              setImmediate(callback, {});
          },
        }),
        supportedFeatures: { triplePattern: true },
      };
      let router = {
        extractQueryParams: function (request, query) {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        },
      };
      htmlView = new QuadPatternFragmentsHtmlView();
      rdfView = new QuadPatternFragmentsRdfView();
      sinon.spy(htmlView, 'render');
      sinon.spy(rdfView, 'render');
      controller = new QuadPatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': datasource },
        views: [htmlView, rdfView],
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      htmlView.render.reset();
      rdfView.render.reset();
    }

    describe('receiving a request without Accept header', () => {
      let response;
      before((done) => {
        resetAll();
        client.get('/my-datasource')
          .end((error, res) => { response = res; done(error); });
      });

      it('should call the default view', () => {
        htmlView.render.should.have.been.calledOnce;
      });

      it('should set the text/html content type', () => {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of */*', () => {
      let response;
      before((done) => {
        resetAll();
        client.get('/my-datasource').set('Accept', '*/*')
          .end((error, res) => { response = res; done(error); });
      });

      it('should call the HTML view', () => {
        htmlView.render.should.have.been.calledOnce;
      });

      it('should set the text/html content type', () => {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', () => {
      let response;
      before((done) => {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/html')
          .end((error, res) => { response = res; done(error); });
      });

      it('should call the HTML view', () => {
        htmlView.render.should.have.been.calledOnce;
      });

      it('should set the text/html content type', () => {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', () => {
      let response;
      before((done) => {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/turtle')
          .end((error, res) => { response = res; done(error); });
      });

      it('should call the Turtle view', () => {
        rdfView.render.should.have.been.calledOnce;
      });

      it('should set the text/turtle content type', () => {
        response.headers.should.have.property('content-type', 'text/turtle;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/n3', () => {
      let response;
      before((done) => {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/n3')
          .end((error, res) => { response = res; done(error); });
      });

      it('should call the Turtle view', () => {
        rdfView.render.should.have.been.calledOnce;
      });

      it('should set the text/n3 content type', () => {
        response.headers.should.have.property('content-type', 'text/n3;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        response.headers.should.have.property('vary', 'Accept');
      });
    });
  });

  describe('A QuadPatternFragmentsController instance without matching view', () => {
    let controller, client;
    before(() => {
      let datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
        supportedFeatures: { triplePattern: true },
      };
      let router = {
        extractQueryParams: function (request, query) {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        },
      };
      controller = new QuadPatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': datasource },
      });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request without Accept header', () => {
      let response;
      before((done) => {
        client.get('/my-datasource')
          .end((error, res) => { response = res; done(error); });
      });

      it('should return status code 406', () => {
        response.should.have.property('statusCode', 406);
      });

      it('should set the text/plain content type', () => {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', () => {
      let response;
      before((done) => {
        client.get('/my-datasource').set('Accept', 'text/html')
          .end((error, res) => { response = res; done(error); });
      });

      it('should return status code 406', () => {
        response.should.have.property('statusCode', 406);
      });

      it('should set the text/plain content type', () => {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        response.headers.should.have.property('vary', 'Accept');
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with a datasource that synchronously errors', () => {
    let controller, client, router, datasource, error, view;
    before(() => {
      router = {
        extractQueryParams: sinon.spy((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      error = new Error('datasource error'),
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().throws(error),
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView(),
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { '/my-datasource': datasource },
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      router.extractQueryParams.reset();
    }

    describe('receiving a request for a fragment', () => {
      before((done) => {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should emit the error', () => {
        expect(controller.error).to.equal(error);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with a datasource that asynchronously errors', () => {
    let controller, client, router, datasource, error, view;
    before(() => {
      router = {
        extractQueryParams: sinon.spy((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      error = new Error('datasource error'),
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: function (query, callback) { setImmediate(callback.bind(null, error)); },
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView(),
      view.render = sinon.stub(); // avoid writing a partial body
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { 'my-datasource': datasource },
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      router.extractQueryParams.reset();
    }

    describe('receiving a request for a fragment', () => {
      before((done) => {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should emit the error', () => {
        expect(controller.error).to.equal(error);
      });
    });
  });
});
