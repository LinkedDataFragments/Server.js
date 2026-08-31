/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DummyServer, type SpiedController } from '../../../../test/DummyServer';
import { controllers, views } from '../../index';
import { datasources as coreDatasources, UrlData } from '@ldf/core';
import type { DatasourceRegistry, Query, QueryFeatures, RouterRequest } from '@ldf/core';
import type { Quad } from 'rdf-js';
import { empty } from 'asynciterator';
import type { AsyncIterator } from 'asynciterator';

import * as http from 'http';
import * as request from 'supertest';
import { DataFactory as dataFactory } from 'n3';

const { QuadPatternFragmentsController } = controllers;
const { QuadPatternFragmentsHtmlView, QuadPatternFragmentsRdfView } = views.quadpatternfragments;
const { Datasource } = coreDatasources;

type MutableQuery = Query & { features: QueryFeatures };

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
    let controller: InstanceType<typeof QuadPatternFragmentsController> & Partial<SpiedController>,
        client: request.Agent,
        routerA: { extractQueryParams: Mock<(request: RouterRequest, query: Query) => void> },
        routerB: { extractQueryParams: Mock<(request: RouterRequest, query: Query) => void> },
        routerC: { extractQueryParams: Mock<(request: RouterRequest, query: MutableQuery) => void> },
        datasource: InstanceType<typeof Datasource>,
        supportsQuerySpy: Mock<(query: Query) => boolean>,
        selectSpy: Mock<(query: Query) => AsyncIterator<Quad>>,
        selectResult: AsyncIterator<Quad>,
        datasources: DatasourceRegistry,
        view: InstanceType<typeof QuadPatternFragmentsRdfView>,
        renderSpy: Mock<InstanceType<typeof QuadPatternFragmentsRdfView>['render']>,
        prefixes: Record<string, string>;
    beforeAll(() => {
      routerA = { extractQueryParams: vi.fn() };
      routerB = { extractQueryParams: vi.fn(() => { throw new Error('second router error'); }) };
      routerC = {
        extractQueryParams: vi.fn((request: RouterRequest, query: MutableQuery) => {
          query.features.datasource = true;
          query.features.other = true;
          query.datasource = '/my-datasource';
        }),
      };
      datasource = new Datasource({ dataFactory, title: 'My data' });
      supportsQuerySpy = vi.fn().mockReturnValue(true);
      datasource.supportsQuery = supportsQuerySpy;
      selectResult = empty<Quad>();
      selectResult.setProperty('metadata', {});
      selectSpy = vi.fn().mockReturnValue(selectResult);
      datasource.select = selectSpy;
      datasource.supportedFeatures = { quadPattern: true };
      datasources = { 'my-datasource': datasource };
      view = new QuadPatternFragmentsRdfView({ dataFactory });
      renderSpy = vi.spyOn(view, 'render');
      prefixes = { a: 'a' };
      controller = new QuadPatternFragmentsController({
        urlData: new UrlData({ baseURL: 'https://example.org/base/?bar=foo' }),
        routers: [routerA, routerB, routerC],
        datasources: datasources,
        views: [view],
        prefixes: prefixes,
      });
      client = request.agent(DummyServer(controller));
    });
    function resetAll() {
      routerA.extractQueryParams.mockClear();
      routerB.extractQueryParams.mockClear();
      routerC.extractQueryParams.mockClear();
      supportsQuerySpy.mockClear();
      selectSpy.mockClear();
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
        expect(args[0].url?.query).toEqual({ a: 'b', c: 'd' });

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
        expect(supportsQuerySpy).toHaveBeenCalledOnce();
        expect(supportsQuerySpy).toHaveBeenCalledWith(query);
      });

      it('should send the query to the right data source', () => {
        let query = routerC.extractQueryParams.mock.calls[0][1];
        expect(selectSpy).toHaveBeenCalledOnce();
        expect(selectSpy.mock.calls[0][0]).toBe(query);
      });

      it('should pass the query result to the output view', () => {
        expect(renderSpy).toHaveBeenCalledOnce();
        let args = renderSpy.mock.calls[0];

        expect(typeof args[0]).toBe('object'); // settings
        expect(args[1]).toBeInstanceOf(http.IncomingMessage);
        expect(args[2]).toBeInstanceOf(http.ServerResponse);
      });

      it('should pass the correct settings to the view', () => {
        expect(renderSpy).toHaveBeenCalledOnce();
        let query = routerC.extractQueryParams.mock.calls[0][1];
        let settings = renderSpy.mock.calls[0][0];

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
        expect(settings.results).toBe(selectResult);
        expect(settings.prefixes).toEqual(prefixes);
        expect(settings.query).toEqual(query);
        expect(settings.datasources).toEqual({ '/my-datasource': datasource });
        expect(query).toHaveProperty('patternString', '{ ?s ?p ?o ?g. }');
      });
    });

    describe('receiving a request for an unsupported fragment', () => {
      beforeAll(async () => {
        resetAll();
        supportsQuerySpy = vi.fn().mockReturnValue(false);
        datasource.supportsQuery = supportsQuerySpy;
        await client.get('/my-datasource?a=b&c=d');
      });

      it('should verify whether the data source supports the query', () => {
        let query = routerC.extractQueryParams.mock.calls[0][1];
        expect(supportsQuerySpy).toHaveBeenCalledOnce();
        expect(supportsQuerySpy).toHaveBeenCalledWith(query);
      });

      it('should not send the query to the data source', () => {
        expect(selectSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('A QuadPatternFragmentsController instance with 2 views', () => {
    let controller: InstanceType<typeof QuadPatternFragmentsController> & Partial<SpiedController>,
        client: request.Agent,
        htmlView: InstanceType<typeof QuadPatternFragmentsHtmlView>, rdfView: InstanceType<typeof QuadPatternFragmentsRdfView>,
        htmlRenderSpy: Mock<InstanceType<typeof QuadPatternFragmentsHtmlView>['render']>,
        rdfRenderSpy: Mock<InstanceType<typeof QuadPatternFragmentsRdfView>['render']>;
    beforeAll(() => {
      let datasource = new Datasource({ dataFactory });
      datasource.supportsQuery = vi.fn().mockReturnValue(true);
      datasource.select = vi.fn(() => {
        let it = empty<Quad>();
        it.setProperty('metadata', {});
        return it;
      });
      datasource.supportedFeatures = { triplePattern: true };
      let router = {
        extractQueryParams: function (request: RouterRequest, query: MutableQuery) {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        },
      };
      htmlView = new QuadPatternFragmentsHtmlView();
      rdfView = new QuadPatternFragmentsRdfView({ dataFactory });
      htmlRenderSpy = vi.spyOn(htmlView, 'render');
      rdfRenderSpy = vi.spyOn(rdfView, 'render');
      controller = new QuadPatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': datasource },
        views: [htmlView, rdfView],
      });
      client = request.agent(DummyServer(controller));
    });
    function resetAll() {
      htmlRenderSpy.mockClear();
      rdfRenderSpy.mockClear();
    }

    describe('receiving a request without Accept header', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource');
      });

      it('should call the default view', () => {
        expect(htmlRenderSpy).toHaveBeenCalledOnce();
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of */*', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource').set('Accept', '*/*');
      });

      it('should call the HTML view', () => {
        expect(htmlRenderSpy).toHaveBeenCalledOnce();
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource').set('Accept', 'text/html');
      });

      it('should call the HTML view', () => {
        expect(htmlRenderSpy).toHaveBeenCalledOnce();
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource').set('Accept', 'text/turtle');
      });

      it('should call the Turtle view', () => {
        expect(rdfRenderSpy).toHaveBeenCalledOnce();
      });

      it('should set the text/turtle content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/turtle;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/n3', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/my-datasource').set('Accept', 'text/n3');
      });

      it('should call the Turtle view', () => {
        expect(rdfRenderSpy).toHaveBeenCalledOnce();
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
    let controller: InstanceType<typeof QuadPatternFragmentsController> & Partial<SpiedController>, client: request.Agent;
    beforeAll(() => {
      let datasource = new Datasource({ dataFactory });
      datasource.supportsQuery = vi.fn().mockReturnValue(true);
      datasource.select = vi.fn(() => empty<Quad>());
      datasource.supportedFeatures = { triplePattern: true };
      let router = {
        extractQueryParams: function (request: RouterRequest, query: MutableQuery) {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        },
      };
      controller = new QuadPatternFragmentsController({
        routers: [router],
        datasources: { 'my-datasource': datasource },
      });
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request without Accept header', () => {
      let response: request.Response;
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
      let response: request.Response;
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
    let controller: InstanceType<typeof QuadPatternFragmentsController> & Partial<SpiedController>,
        client: request.Agent,
        router: { extractQueryParams: Mock<(request: RouterRequest, query: MutableQuery) => void> },
        datasource: InstanceType<typeof Datasource>, error: Error, view: InstanceType<typeof QuadPatternFragmentsRdfView>;
    beforeAll(() => {
      router = {
        extractQueryParams: vi.fn((request: RouterRequest, query: MutableQuery) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      error = new Error('datasource error');
      datasource = new Datasource({ dataFactory });
      datasource.supportsQuery = vi.fn().mockReturnValue(true);
      datasource.select = vi.fn(() => { throw error; });
      datasource.supportedFeatures = { triplePattern: true };
      view = new QuadPatternFragmentsRdfView({ dataFactory });
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { '/my-datasource': datasource },
      });
      client = request.agent(DummyServer(controller));
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
    let controller: InstanceType<typeof QuadPatternFragmentsController> & Partial<SpiedController>,
        client: request.Agent,
        router: { extractQueryParams: Mock<(request: RouterRequest, query: MutableQuery) => void> },
        datasource: InstanceType<typeof Datasource>, error: Error, view: InstanceType<typeof QuadPatternFragmentsRdfView>;
    beforeAll(() => {
      router = {
        extractQueryParams: vi.fn((request: RouterRequest, query: MutableQuery) => {
          query.features.datasource = true;
          query.datasource = '/my-datasource';
        }),
      };
      error = new Error('datasource error');
      datasource = new Datasource({ dataFactory });
      datasource.supportsQuery = vi.fn().mockReturnValue(true);
      datasource.select = vi.fn((query: Query, onError?: (error?: Error) => void) => {
        setImmediate(() => onError?.(error));
        return empty<Quad>();
      });
      datasource.supportedFeatures = { triplePattern: true };
      view = new QuadPatternFragmentsRdfView({ dataFactory });
      view.render = vi.fn(); // avoid writing a partial body
      controller = new QuadPatternFragmentsController({
        routers: [router],
        views: [view],
        datasources: { 'my-datasource': datasource },
      });
      client = request.agent(DummyServer(controller));
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
});
