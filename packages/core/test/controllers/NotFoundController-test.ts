/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DummyServer, type SpiedController } from '../../../../test/DummyServer';
import { controllers, views, datasources as coreDatasources, UrlData } from '../../index';
import type { DatasourceRegistry } from '../../index';

import * as request from 'supertest';
import { DataFactory as dataFactory } from 'n3';

const { NotFoundController } = controllers;
const { NotFoundHtmlView, NotFoundRdfView } = views.notfound;
const { Datasource } = coreDatasources;

describe('NotFoundController', () => {
  describe('The NotFoundController module', () => {
    it('should be a function', () => {
      expect(typeof NotFoundController).toBe('function');
    });

    it('should be a NotFoundController constructor', () => {
      expect(new NotFoundController()).toBeInstanceOf(NotFoundController);
    });
  });

  describe('A NotFoundController instance without views', () => {
    let controller: InstanceType<typeof NotFoundController> & Partial<SpiedController>, client: request.Agent;
    beforeAll(() => {
      controller = new NotFoundController();
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      let response: request.Response;
      beforeAll(async () => {
        response = await client.get('/notfound');
      });

      it('should not hand over to the next controller', () => {
        expect(controller.next).not.toHaveBeenCalled();
      });

      it('should have a 404 status', () => {
        expect(response).toHaveProperty('statusCode', 404);
      });

      it('should set the text/plain content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });

      it('should send a textual error body', () => {
        expect(response).toHaveProperty('text', '/notfound not found\n');
      });
    });
  });

  describe('A NotFoundController instance with HTML and RDF views', () => {
    let controller: InstanceType<typeof NotFoundController> & Partial<SpiedController>,
        htmlView: InstanceType<typeof NotFoundHtmlView>, rdfView: InstanceType<typeof NotFoundRdfView>,
        htmlRenderSpy: Mock<InstanceType<typeof NotFoundHtmlView>['render']>,
        rdfRenderSpy: Mock<InstanceType<typeof NotFoundRdfView>['render']>,
        datasources: DatasourceRegistry, client: request.Agent;
    beforeAll(() => {
      htmlView = new NotFoundHtmlView({ dataFactory });
      rdfView  = new NotFoundRdfView({ dataFactory });
      htmlRenderSpy = vi.spyOn(htmlView, 'render');
      rdfRenderSpy = vi.spyOn(rdfView, 'render');
      datasources = { a: new Datasource({ dataFactory, title: 'foo', path: 'foo', urlData: new UrlData({ baseURL: 'http://example.org/' }) }) };
      controller = new NotFoundController({ views: [htmlView, rdfView], datasources: datasources });
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
        response = await client.get('/notfound');
      });

      it('should not hand over to the next controller', () => {
        expect(controller.next).not.toHaveBeenCalled();
      });

      it('should call the HTML view', () => {
        expect(htmlRenderSpy).toHaveBeenCalledOnce();
      });

      it('should not call the RDF view', () => {
        expect(rdfRenderSpy).not.toHaveBeenCalled();
      });

      it('should have a 404 status', () => {
        expect(response).toHaveProperty('statusCode', 404);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });

      it('should send an HTML error body', () => {
        expect(response.text).toContain('No resource with URL <code>/notfound</code> was found.');
      });
    });

    describe('receiving a request with an Accept header of */*', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/notfound').set('Accept', '*/*');
      });

      it('should not hand over to the next controller', () => {
        expect(controller.next).not.toHaveBeenCalled();
      });

      it('should call the HTML view', () => {
        expect(htmlRenderSpy).toHaveBeenCalledOnce();
      });

      it('should not call the RDF view', () => {
        expect(rdfRenderSpy).not.toHaveBeenCalled();
      });

      it('should have a 404 status', () => {
        expect(response).toHaveProperty('statusCode', 404);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });

      it('should send an HTML error body', () => {
        expect(response.text).toContain('No resource with URL <code>/notfound</code> was found.');
      });
    });

    describe('receiving a request with an Accept header of text/html', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/notfound').set('Accept', 'text/html');
      });

      it('should not hand over to the next controller', () => {
        expect(controller.next).not.toHaveBeenCalled();
      });

      it('should call the HTML view', () => {
        expect(htmlRenderSpy).toHaveBeenCalledOnce();
      });

      it('should not call the RDF view', () => {
        expect(rdfRenderSpy).not.toHaveBeenCalled();
      });

      it('should have a 404 status', () => {
        expect(response).toHaveProperty('statusCode', 404);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });

      it('should send an HTML error body', () => {
        expect(response.text).toContain('No resource with URL <code>/notfound</code> was found.');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/notfound').set('Accept', 'text/turtle');
      });

      it('should not hand over to the next controller', () => {
        expect(controller.next).not.toHaveBeenCalled();
      });

      it('should call the RDF view', () => {
        expect(rdfRenderSpy).toHaveBeenCalledOnce();
      });

      it('should not call the HTML view', () => {
        expect(htmlRenderSpy).not.toHaveBeenCalled();
      });

      it('should have a 404 status', () => {
        expect(response).toHaveProperty('statusCode', 404);
      });

      it('should set the text/turtle content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/turtle;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });

      it('should send a Turtle error body', () => {
        expect(response.text).toContain('<http://example.org/foo#dataset> a <http://rdfs.org/ns/void#Dataset>');
        expect(response.text).not.toContain('<#metadata> <http://xmlns.com/foaf/0.1/primaryTopic> <>.');
      });
    });

    describe('receiving a request with an Accept header of application/trig', () => {
      let response: request.Response;
      beforeAll(async () => {
        resetAll();
        response = await client.get('/notfound').set('Accept', 'application/trig');
      });

      it('should not hand over to the next controller', () => {
        expect(controller.next).not.toHaveBeenCalled();
      });

      it('should call the RDF view', () => {
        expect(rdfRenderSpy).toHaveBeenCalledOnce();
      });

      it('should not call the HTML view', () => {
        expect(htmlRenderSpy).not.toHaveBeenCalled();
      });

      it('should have a 404 status', () => {
        expect(response).toHaveProperty('statusCode', 404);
      });

      it('should set the text/html content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'application/trig;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', () => {
        expect(response.headers).toHaveProperty('vary', 'Accept');
      });

      it('should send a TriG error body', () => {
        expect(response.text).toContain('<http://example.org/foo#dataset> a <http://rdfs.org/ns/void#Dataset>');
        expect(response.text).toContain('<#metadata> <http://xmlns.com/foaf/0.1/primaryTopic> <>.');
      });
    });
  });
});
