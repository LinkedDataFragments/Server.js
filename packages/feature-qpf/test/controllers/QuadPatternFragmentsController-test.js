/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import DummyServer from '../../../../test/DummyServer';
let QuadPatternFragmentsController = require('../../').controllers.QuadPatternFragmentsController;

let request = require('supertest'),
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
      routerA = { extractQueryParams: vi.fn() };
      routerB = { extractQueryParams: vi.fn(() => { throw new Error('second router error'); }) };
      routerC = {
        extractQueryParams: vi.fn((request, query) => {
          query.features.datasource = true;
          query.features.other = true;
          query.datasource = '/my-datasource';
          query.other = 'other';
        }),
      };
      datasource = {
        title: 'My data',
        supportsQuery: vi.fn().mockReturnValue(true),
        select: vi.fn().mockReturnValue({ stream: 'items' }),
        supportedFeatures: { quadPattern: true },
      };
      datasources = { 'my-datasource': datasource };
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
      vi.spyOn(view, 'render');
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
      routerA.extractQueryParams.mockClear();
      routerB.extractQueryParams.mockClear();
      routerC.extractQueryParams.mockClear();
      datasource.supportsQuery.mockClear();
      datasource.select.mockClear();
    }

    describe('receiving a request for a fragment', () => {
      beforeAll(async () => {
        resetAll();
        await client.get('/my-datasource?a=b&c=d');
      });

      it('should call the first router with the request and an empty query', () => {
        expect(routerA.extractQueryParams).toHaveBeenCalledOnce();

        let args = routerA.extractQueryParams.mock.calls[0];
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
        expect(routerB.extractQueryParams).toHaveBeenCalledOnce();

        expect(routerB.extractQueryParams.mock.calls[0][0]).toBe(
          routerA.extractQueryParams.mock.calls[0][0]);
        expect(routerB.extractQueryParams.mock.calls[0][1]).toBe(
          routerA.extractQueryParams.mock.calls[0][1]);
      });

      it('should call the third router with the same request and query', () => {
        expect(routerC.extractQueryParams).toHaveBeenCalledOnce();

        expect(routerC.extractQueryParams.mock.calls[0][0]).toBe(
          routerA.extractQueryParams.mock.calls[0][0]);
        expect(routerC.extractQueryParams.mock.calls[0][1]).toBe(
          routerA.extractQueryParams.mock.calls[0][1]);
      });

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.mock.calls[0][1];
        expect(datasource.supportsQuery).toHaveBeenCalledOnce();
        expect(datasource.supportsQuery).toHaveBeenCalledWith(query);
      });

      it('should send the query to the right data source', () => {
        let query = routerC.extractQueryParams.mock.calls[0][1];
        expect(datasource.select).toHaveBeenCalledOnce();
        expect(datasource.select.mock.calls[0][0]).toBe(query);
      });

      it('should pass the query result to the output view', () => {
        expect(view.render).toHaveBeenCalledOnce();
        let args = view.render.mock.calls[0];

        expect(typeof args[0]).toBe('object'); // settings
        expect(args[1]).toBeInstanceOf(http.IncomingMessage);
        expect(args[2]).toBeInstanceOf(http.ServerResponse);
      });

      it('should pass the correct settings to the view', () => {
        expect(view.render).toHaveBeenCalledOnce();
        let query = routerC.extractQueryParams.mock.calls[0][1];
        let settings = view.render.mock.calls[0][0];

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

    describe('receiving a request for page 2 or later of a fragment', () => {
      beforeAll(async () => {
        resetAll();
        await client.get('/my-datasource?a=b&page=3');
      });

      it('should include a previousPageUrl', () => {
        let settings = view.render.mock.calls[view.render.mock.calls.length - 1][0];
        expect(settings.fragment.previousPageUrl).toBe('https://example.org/my-datasource?a=b&page=2');
      });
    });

    describe('receiving a request for an unsupported fragment', () => {
      beforeAll(async () => {
        resetAll();
        datasource.supportsQuery = vi.fn().mockReturnValue(false);
        await client.get('/my-datasource?a=b&c=d');
      });

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.mock.calls[0][1];
        expect(datasource.supportsQuery).toHaveBeenCalledOnce();
        expect(datasource.supportsQuery).toHaveBeenCalledWith(query);
      });

      it('should not send the query to the data source', () => {
        expect(datasource.select).not.toHaveBeenCalled();
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with 2 views', () => {
    let controller, client, htmlView, rdfView;
    beforeAll(() => {
      let datasource = {
        supportsQuery: vi.fn().mockReturnValue(true),
        select: vi.fn().mockReturnValue({
          // Mocks AsyncIterator's own on(event, callback) signature.
          // eslint-disable-next-line promise/prefer-await-to-callbacks
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
      vi.spyOn(htmlView, 'render');
      vi.spyOn(rdfView, 'render');
      controller = new QuadPatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': datasource },
        views: [htmlView, rdfView],
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      htmlView.render.mockClear();
      rdfView.render.mockClear();
    }

    describe('receiving a request without Accept header', () => {
      let response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource');
      });

      it('should call the default view', () => {
        expect(htmlView.render).toHaveBeenCalledOnce();
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
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource').set('Accept', '*/*');
      });

      it('should call the HTML view', () => {
        expect(htmlView.render).toHaveBeenCalledOnce();
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
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource').set('Accept', 'text/html');
      });

      it('should call the HTML view', () => {
        expect(htmlView.render).toHaveBeenCalledOnce();
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
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource').set('Accept', 'text/turtle');
      });

      it('should call the Turtle view', () => {
        expect(rdfView.render).toHaveBeenCalledOnce();
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
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource').set('Accept', 'text/n3');
      });

      it('should call the Turtle view', () => {
        expect(rdfView.render).toHaveBeenCalledOnce();
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
        supportsQuery: vi.fn().mockReturnValue(true),
        select: vi.fn(),
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
      beforeAll(async () => {
        response = await client.get('/my-datasource');
      });

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
      beforeAll(async () => {
        response = await client.get('/my-datasource').set('Accept', 'text/html');
      });

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
        extractQueryParams: vi.fn((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      error = new Error('datasource error'),
      datasource = {
        supportsQuery: vi.fn().mockReturnValue(true),
        select: vi.fn(() => { throw error; }),
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
      router.extractQueryParams.mockClear();
    }

    describe('receiving a request for a fragment', () => {
      beforeAll(async () => {
        resetAll();
        await client.get('/my-datasource?a=b&c=d');
      });

      it('should emit the error', () => {
        expect(controller.error).toBe(error);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with a datasource that asynchronously errors', () => {
    let controller, client, router, datasource, error, view;
    beforeAll(() => {
      router = {
        extractQueryParams: vi.fn((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      error = new Error('datasource error'),
      datasource = {
        supportsQuery: vi.fn().mockReturnValue(true),
        // Mocks Datasource.select's own callback-based signature.
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        select: function (query, callback) { setImmediate(callback.bind(null, error)); },
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
      view.render = vi.fn(); // avoid writing a partial body
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { 'my-datasource': datasource },
      });
      client = request.agent(new DummyServer(controller));
    });
    function resetAll() {
      router.extractQueryParams.mockClear();
    }

    describe('receiving a request for a fragment', () => {
      beforeAll(async () => {
        resetAll();
        await client.get('/my-datasource?a=b&c=d');
      });

      it('should emit the error', () => {
        expect(controller.error).toBe(error);
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with an extension', () => {
    let controller, client, router, datasource, view, extension;
    beforeAll(() => {
      router = {
        extractQueryParams: vi.fn((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      datasource = {
        supportsQuery: vi.fn().mockReturnValue(true),
        select: vi.fn().mockReturnValue({}),
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
      view.render = vi.fn((settings, request, response) => response.end());
      extension = { handleRequest: vi.fn((request, response, next) => next()) };
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { '/my-datasource': datasource },
        extensions: [extension],
      });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request for a fragment', () => {
      beforeAll(async () => {
        await client.get('/my-datasource?a=b&c=d');
      });

      it('should call the extension', () => {
        expect(extension.handleRequest).toHaveBeenCalledOnce();
      });

      it('should render the view once the extension completes', () => {
        expect(view.render).toHaveBeenCalledOnce();
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with an extension that errors', () => {
    let controller, client, router, datasource, view, extension, error, stderrWrite;
    beforeAll(() => {
      router = {
        extractQueryParams: vi.fn((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      datasource = {
        supportsQuery: vi.fn().mockReturnValue(true),
        select: vi.fn().mockReturnValue({}),
        supportedFeatures: { triplePattern: true },
      };
      view = new QuadPatternFragmentsRdfView({ dataFactory }),
      view.render = vi.fn((settings, request, response) => response.end());
      error = new Error('extension error');
      extension = { handleRequest: vi.fn((request, response, next) => next(error)) };
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { '/my-datasource': datasource },
        extensions: [extension],
      });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request for a fragment', () => {
      beforeAll(async () => {
        stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => {});
        await client.get('/my-datasource?a=b&c=d');
      });

      afterAll(() => { stderrWrite.mockRestore(); });

      it('should log the extension error to stderr', () => {
        expect(stderrWrite).toHaveBeenCalledOnce();
        expect(stderrWrite.mock.calls[0][0]).toContain('extension error');
      });

      it('should still render the view', () => {
        expect(view.render).toHaveBeenCalledOnce();
      });
    });
  });

  describe('_createPatternString', () => {
    let controller = new QuadPatternFragmentsController();

    it('should use variables when no query terms are given', () => {
      expect(controller._createPatternString({}, false)).toBe('{ ?s ?p ?o. }');
    });

    it('should serialize bound subject and predicate IRIs', () => {
      let query = { subject: dataFactory.namedNode('http://ex.org/s'), predicate: dataFactory.namedNode('http://ex.org/p') };
      expect(controller._createPatternString(query, false)).toBe('{ <http://ex.org/s> <http://ex.org/p> ?o. }');
    });

    it('should serialize a bound object IRI', () => {
      let query = { object: dataFactory.namedNode('http://ex.org/o') };
      expect(controller._createPatternString(query, false)).toBe('{ ?s ?p <http://ex.org/o> . }');
    });

    it('should serialize a bound object literal', () => {
      let query = { object: dataFactory.literal('a literal') };
      expect(controller._createPatternString(query, false)).toBe('{ ?s ?p a literal. }');
    });

    it('should not serialize a graph when quads are not supported', () => {
      let query = { graph: dataFactory.namedNode('http://ex.org/g') };
      expect(controller._createPatternString(query, false)).toBe('{ ?s ?p ?o. }');
    });

    it('should serialize the default graph when quads are supported', () => {
      let query = { graph: dataFactory.defaultGraph() };
      expect(controller._createPatternString(query, true)).toBe('{ ?s ?p ?o @default. }');
    });

    it('should serialize a bound graph IRI when quads are supported', () => {
      let query = { graph: dataFactory.namedNode('http://ex.org/g') };
      expect(controller._createPatternString(query, true)).toBe('{ ?s ?p ?o <http://ex.org/g>. }');
    });

    it('should use a variable graph when quads are supported but none is given', () => {
      expect(controller._createPatternString({}, true)).toBe('{ ?s ?p ?o ?g. }');
    });
  });

  describe('when an extension errors without a stack trace', () => {
    it('should log the error message instead of a stack trace', async () => {
      let router = {
        extractQueryParams: vi.fn((request, query) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      let datasource = {
        supportsQuery: vi.fn().mockReturnValue(true),
        select: vi.fn().mockReturnValue({}),
        supportedFeatures: { triplePattern: true },
      };
      let view = new QuadPatternFragmentsRdfView({ dataFactory });
      view.render = vi.fn((settings, request, response) => response.end());
      let error = { message: 'no stack here' }; // a thrown value without a real .stack
      let extension = { handleRequest: vi.fn((request, response, next) => next(error)) };
      let controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { '/my-datasource': datasource },
        extensions: [extension],
      });
      let client = request.agent(new DummyServer(controller));
      let stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => {});

      await client.get('/my-datasource?a=b&c=d');
      expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining(String(error)));
      stderrWrite.mockRestore();
    });
  });

  describe('close', () => {
    it('should close every datasource, even if one throws while closing', () => {
      let dsA = { close: vi.fn() };
      let dsB = { close: vi.fn(() => { throw new Error('close failed'); }) };
      let dsC = { close: vi.fn() };
      let controller = new QuadPatternFragmentsController({
        datasources: { a: dsA, b: dsB, c: dsC },
      });

      controller.close();

      expect(dsA.close).toHaveBeenCalledOnce();
      expect(dsB.close).toHaveBeenCalledOnce();
      expect(dsC.close).toHaveBeenCalledOnce();
    });
  });
});
