/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
const sinon = require('sinon');
let QuadPatternFragmentsController = require('../../').controllers.QuadPatternFragmentsController;

let request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer'),
    http = require('http');

let QuadPatternFragmentsHtmlView = require('../../').views.quadpatternfragments.QuadPatternFragmentsHtmlView,
    QuadPatternFragmentsRdfView  = require('../../').views.quadpatternfragments.QuadPatternFragmentsRdfView,
    UrlData                      = require('@ldf/core').UrlData,
    dataFactory                  = require('n3').DataFactory;

describe('QuadPatternFragmentsController', () => {
  describe('The QuadPatternFragmentsController module', () => {
    it('should be a function', () => {
      expect(typeof QuadPatternFragmentsController).toBe('function');
    });

    it('should be a QuadPatternFragmentsController constructor', () => {
      expect(new QuadPatternFragmentsController()).toBeInstanceOf(QuadPatternFragmentsController);
    });
  });

  describe('A QuadPatternFragmentsController instance with 3 routers', () => {
    let controller, client, routerA, routerB, routerC, datasource, datasources, view, prefixes;
    beforeAll(() => {
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
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
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
      beforeAll(() => new Promise((done) => {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      }));

      it('should call the first router with the request and an empty query', () => {
        expect(routerA.extractQueryParams.calledOnce).toBe(true);

        let args = routerA.extractQueryParams.firstCall.args;
        expect(args[0]).toHaveProperty('url');
        expect(args[0].url).toHaveProperty('path', '/my-datasource?a=b&c=d');
        expect(args[0].url).toHaveProperty('pathname', '/my-datasource');
        expect(args[0].url).toHaveProperty('query');
        expect(args[0].url.query).toEqual({ a: 'b', c: 'd' });

        expect(typeof args[1]).toBe('object');
        expect(args[1]).toHaveProperty('features');
        expect(typeof args[1].features).toBe('object');
      });

      it('should call the second router with the same request and query', () => {
        expect(routerB.extractQueryParams.calledOnce).toBe(true);

        expect(routerB.extractQueryParams.firstCall.args[0]).toBe(
          routerA.extractQueryParams.firstCall.args[0]);
        expect(routerB.extractQueryParams.firstCall.args[1]).toBe(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should call the third router with the same request and query', () => {
        expect(routerC.extractQueryParams.calledOnce).toBe(true);

        expect(routerC.extractQueryParams.firstCall.args[0]).toBe(
          routerA.extractQueryParams.firstCall.args[0]);
        expect(routerC.extractQueryParams.firstCall.args[1]).toBe(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        expect(datasource.supportsQuery.calledOnce).toBe(true);
        expect(datasource.supportsQuery.calledWith(query)).toBe(true);
      });

      it('should send the query to the right data source', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        expect(datasource.select.calledOnce).toBe(true);
        expect(datasource.select.calledWith(query)).toBe(true);
      });

      it('should pass the query result to the output view', () => {
        expect(view.render.calledOnce).toBe(true);
        let args = view.render.firstCall.args;

        expect(typeof args[0]).toBe('object'); // settings
        expect(args[1]).toBeInstanceOf(http.IncomingMessage);
        expect(args[2]).toBeInstanceOf(http.ServerResponse);
      });

      it('should pass the correct settings to the view', () => {
        expect(view.render.calledOnce).toBe(true);
        let query = routerC.extractQueryParams.firstCall.args[1];
        let settings = view.render.firstCall.args[0];

        expect(settings.datasource).toHaveProperty('title', 'My data');
        expect(settings.datasource).toHaveProperty('index', 'https://example.org/#dataset');
        expect(settings.datasource).toHaveProperty('url', 'https://example.org/my-datasource#dataset');
        expect(settings.datasource).toHaveProperty('templateUrl', 'https://example.org/my-datasource{?subject,predicate,object,graph}');
        expect(settings.datasource).toHaveProperty('supportsQuads', true);
        expect(settings.fragment).toEqual({
          url:             'https://example.org/my-datasource?a=b&c=d',
          pageUrl:         'https://example.org/my-datasource?a=b&c=d',
          firstPageUrl:    'https://example.org/my-datasource?a=b&c=d&page=1',
          nextPageUrl:     'https://example.org/my-datasource?a=b&c=d&page=2',
          previousPageUrl: null,
        });
        expect(settings.results).toEqual({
          stream: 'items',
        });
        expect(settings.prefixes).toEqual(prefixes);
        expect(settings.query).toEqual(query);
        expect(settings.datasources).toEqual({ '/my-datasource': datasource });
        expect(query).toHaveProperty('patternString', '{ ?s ?p ?o ?g. }');
      });
    });

    describe('receiving a request for an unsupported fragment', () => {
      beforeAll(() => new Promise((done) => {
        resetAll();
        datasource.supportsQuery = sinon.stub().returns(false);
        client.get('/my-datasource?a=b&c=d').end(done);
      }));

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.firstCall.args[1];
        expect(datasource.supportsQuery.calledOnce).toBe(true);
        expect(datasource.supportsQuery.calledWith(query)).toBe(true);
      });

      it('should not send the query to the data source', () => {
        expect(datasource.select.called).toBe(false);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with 2 views', () => {
    let controller, client, htmlView, rdfView;
    beforeAll(() => {
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
      rdfView = new QuadPatternFragmentsRdfView({ dataFactory });
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
      beforeAll(() => new Promise((done) => {
        resetAll();
        client.get('/my-datasource')
          .end((error, res) => { response = res; done(error); });
      }));

      it('should call the default view', () => {
        expect(htmlView.render.calledOnce).toBe(true);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of */*', () => {
      let response;
      beforeAll(() => new Promise((done) => {
        resetAll();
        client.get('/my-datasource').set('Accept', '*/*')
          .end((error, res) => { response = res; done(error); });
      }));

      it('should call the HTML view', () => {
        expect(htmlView.render.calledOnce).toBe(true);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', () => {
      let response;
      beforeAll(() => new Promise((done) => {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/html')
          .end((error, res) => { response = res; done(error); });
      }));

      it('should call the HTML view', () => {
        expect(htmlView.render.calledOnce).toBe(true);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', () => {
      let response;
      beforeAll(() => new Promise((done) => {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/turtle')
          .end((error, res) => { response = res; done(error); });
      }));

      it('should call the Turtle view', () => {
        expect(rdfView.render.calledOnce).toBe(true);
      });

      it('should set the text/turtle content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/turtle;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/n3', () => {
      let response;
      beforeAll(() => new Promise((done) => {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/n3')
          .end((error, res) => { response = res; done(error); });
      }));

      it('should call the Turtle view', () => {
        expect(rdfView.render.calledOnce).toBe(true);
      });

      it('should set the text/n3 content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/n3;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });
  });

  describe('A QuadPatternFragmentsController instance without matching view', () => {
    let controller, client;
    beforeAll(() => {
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
      beforeAll(() => new Promise((done) => {
        client.get('/my-datasource')
          .end((error, res) => { response = res; done(error); });
      }));

      it('should return status code 406', () => {
        expect(response).toHaveProperty('statusCode', 406);
      });

      it('should set the text/plain content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', () => {
      let response;
      beforeAll(() => new Promise((done) => {
        client.get('/my-datasource').set('Accept', 'text/html')
          .end((error, res) => { response = res; done(error); });
      }));

      it('should return status code 406', () => {
        expect(response).toHaveProperty('statusCode', 406);
      });

      it('should set the text/plain content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with a datasource that synchronously errors', () => {
    let controller, client, router, datasource, error, view;
    beforeAll(() => {
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
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
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
      beforeAll(() => new Promise((done) => {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      }));

      it('should emit the error', () => {
        expect(controller.error).toBe(error);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with a datasource that asynchronously errors', () => {
    let controller, client, router, datasource, error, view;
    beforeAll(() => {
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
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
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
      beforeAll(() => new Promise((done) => {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
      }));

      it('should emit the error', () => {
        expect(controller.error).toBe(error);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with an extension', () => {
    let controller, client, router, datasource, view, extension;
    beforeAll(() => {
      router = {
        extractQueryParams: sinon.spy((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({}),
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
      view.render = sinon.spy((settings, request, response) => response.end());
      extension = { handleRequest: sinon.spy((request, response, next) => next()) };
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { '/my-datasource': datasource },
        extensions: [extension],
      });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request for a fragment', () => {
      beforeAll(() => new Promise((done) => {
        client.get('/my-datasource?a=b&c=d').end(done);
      }));

      it('should call the extension', () => {
        expect(extension.handleRequest.calledOnce).toBe(true);
      });

      it('should render the view once the extension completes', () => {
        expect(view.render.calledOnce).toBe(true);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with an extension that errors', () => {
    let controller, client, router, datasource, view, extension, error, stderrWrite;
    beforeAll(() => {
      router = {
        extractQueryParams: sinon.spy((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({}),
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
      view.render = sinon.spy((settings, request, response) => response.end());
      error = new Error('extension error');
      extension = { handleRequest: sinon.spy((request, response, next) => next(error)) };
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { '/my-datasource': datasource },
        extensions: [extension],
      });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request for a fragment', () => {
      beforeAll(() => new Promise((done) => {
        stderrWrite = sinon.stub(process.stderr, 'write');
        client.get('/my-datasource?a=b&c=d').end(() => { stderrWrite.restore(); done(); });
      }));

      it('should log the extension error to stderr', () => {
        expect(stderrWrite.calledOnce).toBe(true);
        expect(stderrWrite.args[0][0]).toContain('extension error');
      });

      it('should still render the view', () => {
        expect(view.render.calledOnce).toBe(true);
      });
    });
  });

  describe('close', () => {
    it('should close every datasource, even if one throws while closing', () => {
      let dsA = { close: sinon.stub() };
      let dsB = { close: sinon.stub().throws(new Error('close failed')) };
      let dsC = { close: sinon.stub() };
      let controller = new QuadPatternFragmentsController({
        datasources: { a: dsA, b: dsB, c: dsC },
      });

      controller.close();

      expect(dsA.close.calledOnce).toBe(true);
      expect(dsB.close.calledOnce).toBe(true);
      expect(dsC.close.calledOnce).toBe(true);
    });
  });
});
