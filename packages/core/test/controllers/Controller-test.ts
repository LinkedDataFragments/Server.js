/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { Mock } from 'vitest';
import { DummyServer, type SpiedController } from '../../../../test/DummyServer';
import { Controller } from '../../lib/controllers/Controller';
import { UrlData } from '../../index';
import type { LdfRequestWithUrl, LdfResponse, ViewSettings } from '../../index';

import * as http from 'http';
import * as request from 'supertest';

// Controller marks _handleRequest protected so subclasses can implement it;
// this subclass widens it to public so this suite can spy on the base class's
// own behavior directly, the way its subclasses already do.
class TestableController extends Controller {
  override _handleRequest(request: LdfRequestWithUrl, response: LdfResponse, next: (error?: Error) => void, settings?: ViewSettings): void {
    return super._handleRequest(request, response, next, settings);
  }
}

describe('Controller', () => {
  describe('The Controller module', () => {
    it('should be a function', () => {
      expect(typeof Controller).toBe('function');
    });

    it('should be a Controller constructor', () => {
      expect(new Controller()).toBeInstanceOf(Controller);
    });
  });

  describe('A Controller instance without baseURL', () => {
    let controller: TestableController & Partial<SpiedController>, client: ReturnType<typeof request.agent>, handleRequestSpy: Mock<TestableController['_handleRequest']>;
    beforeAll(() => {
      controller = new TestableController();
      handleRequestSpy = vi.spyOn(controller, '_handleRequest');
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => client.get('/path?a=b'));

      it('should call _handleRequest with request, response and next', () => {
        expect(handleRequestSpy).toHaveBeenCalledOnce();
        let args = handleRequestSpy.mock.calls[0];
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(handleRequestSpy).toHaveBeenCalledOnce();
        let request = handleRequestSpy.mock.calls[0][0];
        expect(request).toHaveProperty('parsedUrl');
        expect(request.parsedUrl).toEqual({
          protocol: 'http:', host: request.headers.host, hostname: undefined, port: undefined,
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: undefined,
        });
      });

      it('should hand over to the next controller', () => {
        expect(controller.next).toHaveBeenCalledOnce();
      });
    });
  });

  describe('A Controller instance without baseURL using Forwarded header', () => {
    let controller: TestableController & Partial<SpiedController>, client: ReturnType<typeof request.agent>, handleRequestSpy: Mock<TestableController['_handleRequest']>;
    beforeAll(() => {
      controller = new TestableController({ urlData: new UrlData({ baseURL: 'http://example.org:1234/base?c=d#f' }) });
      handleRequestSpy = vi.spyOn(controller, '_handleRequest');
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => client
        .get('/path?a=b')
        .set('X-Forwarded-Host', 'foo:5000')
        // NOTE: the priority will go to the Forwarded header over the X-Forwarded-Host header
        .set('Forwarded', 'proto=https;host="bar:8000"'));

      it('should call _handleRequest with request, response and next', () => {
        expect(handleRequestSpy).toHaveBeenCalledOnce();
        let args = handleRequestSpy.mock.calls[0];
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(handleRequestSpy).toHaveBeenCalledOnce();
        let request = handleRequestSpy.mock.calls[0][0];
        expect(request).toHaveProperty('parsedUrl');
        expect(request.parsedUrl).toEqual({
          protocol: 'https:', host: 'bar:8000', hostname: 'example.org', port: '1234',
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: true,
        });
      });

      it('should hand over to the next controller', () => {
        expect(controller.next).toHaveBeenCalledOnce();
      });
    });
  });

  describe('A Controller instance without baseURL using X-Forwarded-* headers', () => {
    let controller: TestableController & Partial<SpiedController>, client: ReturnType<typeof request.agent>, handleRequestSpy: Mock<TestableController['_handleRequest']>;
    beforeAll(() => {
      controller = new TestableController();
      handleRequestSpy = vi.spyOn(controller, '_handleRequest');
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => client
        .get('/path?a=b')
        .set('X-Forwarded-Host', 'foo:5000')
        .set('X-Forwarded-Proto', 'https'));

      it('should call _handleRequest with request, response and next', () => {
        expect(handleRequestSpy).toHaveBeenCalledOnce();
        let args = handleRequestSpy.mock.calls[0];
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(handleRequestSpy).toHaveBeenCalledOnce();
        let request = handleRequestSpy.mock.calls[0][0];
        expect(request).toHaveProperty('parsedUrl');
        expect(request.parsedUrl).toEqual({
          protocol: 'https:', host: 'foo:5000', hostname: undefined, port: undefined,
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: undefined,
        });
      });

      it('should hand over to the next controller', () => {
        expect(controller.next).toHaveBeenCalledOnce();
      });
    });
  });

  describe('A Controller instance with baseURL', () => {
    let controller: TestableController & Partial<SpiedController>, client: ReturnType<typeof request.agent>, handleRequestSpy: Mock<TestableController['_handleRequest']>;
    beforeAll(() => {
      controller = new TestableController({ urlData: new UrlData({ baseURL: 'http://example.org:1234/base?c=d#f' }) });
      handleRequestSpy = vi.spyOn(controller, '_handleRequest');
      client = request.agent(DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => client.get('/path?a=b'));

      it('should call _handleRequest with request, response and next', () => {
        expect(handleRequestSpy).toHaveBeenCalledOnce();
        let args = handleRequestSpy.mock.calls[0];
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the rebased URL as parsedUrl property', () => {
        expect(handleRequestSpy).toHaveBeenCalledOnce();
        let request = handleRequestSpy.mock.calls[0][0];
        expect(request).toHaveProperty('parsedUrl');
        expect(request.parsedUrl).toEqual({
          protocol: 'http:', host: 'example.org:1234', hostname: 'example.org', port: '1234',
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: true,
        });
      });

      it('should hand over to the next controller', () => {
        expect(controller.next).toHaveBeenCalledOnce();
      });
    });
  });
});
