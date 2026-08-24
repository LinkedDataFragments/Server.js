/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import DummyServer from '../../../../test/DummyServer';
// changed to make tests pass, will be revised in follow up pr
let Controller = require('../../lib/controllers/Controller').Controller,
    UrlData = require('../../lib/UrlData').UrlData,
    ViewCollection = require('../../lib/views/ViewCollection').ViewCollection,
    View = require('../../lib/views/View').View;

let http = require('http'),
    request = require('supertest');

describe('Controller', () => {
  describe('The Controller module', () => {
    it('should be a function', () => {
      expect(typeof Controller).toBe('function');
    });

    it('should be a Controller constructor', () => {
      expect(new Controller()).toBeInstanceOf(Controller);
    });

    it('should have a no-op close method', () => {
      expect(() => new Controller().close()).not.toThrow();
    });
  });

  describe('A Controller instance without baseURL', () => {
    let controller, client;
    beforeAll(() => {
      controller = new Controller();
      vi.spyOn(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => new Promise((done) => {
        client.get('/path?a=b').end(done);
      }));

      it('should call _handleRequest with request, response and next', () => {
        expect(controller._handleRequest).toHaveBeenCalledOnce();
        let args = controller._handleRequest.mock.calls[0];
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(controller._handleRequest).toHaveBeenCalledOnce();
        let request = controller._handleRequest.mock.calls[0][0];
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
    let controller, client;
    beforeAll(() => {
      controller = new Controller({ urlData: new UrlData({ baseURL: 'http://example.org:1234/base?c=d#f' }) });
      vi.spyOn(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => new Promise((done) => {
        client
          .get('/path?a=b')
          .set('X-Forwarded-Host', 'foo:5000')
          // NOTE: the priority will go to the Forwarded header over the X-Forwarded-Host header
          .set('Forwarded', 'proto=https;host="bar:8000"')
          .end(done);
      }));

      it('should call _handleRequest with request, response and next', () => {
        expect(controller._handleRequest).toHaveBeenCalledOnce();
        let args = controller._handleRequest.mock.calls[0];
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(controller._handleRequest).toHaveBeenCalledOnce();
        let request = controller._handleRequest.mock.calls[0][0];
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

    describe('receiving a request with a malformed Forwarded header', () => {
      beforeAll(() => new Promise((done) => {
        client
          .get('/path?a=b')
          .set('Forwarded', 'proto="unterminated')
          .end(done);
      }));

      it('should fall back to the request\'s own information', () => {
        let request = controller._handleRequest.mock.calls[controller._handleRequest.mock.calls.length - 1][0];
        expect(request.parsedUrl).toHaveProperty('protocol', 'http:');
      });
    });

    describe('receiving a request with a Forwarded header that has no proto', () => {
      beforeAll(() => new Promise((done) => {
        client
          .get('/path?a=b')
          .set('Forwarded', 'host="bar:8000"')
          .end(done);
      }));

      it('should fall back to the default protocol while still using the forwarded host', () => {
        let request = controller._handleRequest.mock.calls[controller._handleRequest.mock.calls.length - 1][0];
        expect(request.parsedUrl).toHaveProperty('protocol', 'http:');
        expect(request.parsedUrl).toHaveProperty('host', 'bar:8000');
      });
    });
  });

  describe('A Controller instance without baseURL using X-Forwarded-* headers', () => {
    let controller, client;
    beforeAll(() => {
      controller = new Controller();
      vi.spyOn(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => new Promise((done) => {
        client
          .get('/path?a=b')
          .set('X-Forwarded-Host', 'foo:5000')
          .set('X-Forwarded-Proto', 'https')
          .end(done);
      }));

      it('should call _handleRequest with request, response and next', () => {
        expect(controller._handleRequest).toHaveBeenCalledOnce();
        let args = controller._handleRequest.mock.calls[0];
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        expect(controller._handleRequest).toHaveBeenCalledOnce();
        let request = controller._handleRequest.mock.calls[0][0];
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
    let controller, client;
    beforeAll(() => {
      controller = new Controller({ urlData: new UrlData({ baseURL: 'http://example.org:1234/base?c=d#f' }) });
      vi.spyOn(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', () => {
      beforeAll(() => new Promise((done) => {
        client.get('/path?a=b').end(done);
      }));

      it('should call _handleRequest with request, response and next', () => {
        expect(controller._handleRequest).toHaveBeenCalledOnce();
        let args = controller._handleRequest.mock.calls[0];
        expect(args[0]).toHaveProperty('url');
        expect(args[1]).toBeInstanceOf(http.ServerResponse);
        expect(args[2]).toBeInstanceOf(Function);
      });

      it('should extend _handleRequest with the rebased URL as parsedUrl property', () => {
        expect(controller._handleRequest).toHaveBeenCalledOnce();
        let request = controller._handleRequest.mock.calls[0][0];
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

  describe('A Controller instance constructed with an existing ViewCollection', () => {
    it('should use that ViewCollection instance directly, without wrapping it again', () => {
      let views = new ViewCollection();
      let controller = new Controller({ views });
      expect(controller._views).toBe(views);
    });
  });

  describe('handleRequest with a request that already has a parsedUrl', () => {
    it('should not overwrite the existing parsedUrl', () => {
      let controller = new Controller();
      vi.spyOn(controller, '_handleRequest');
      let existingParsedUrl = { path: '/already-parsed' };
      let request = { parsedUrl: existingParsedUrl, headers: {} };
      let response = {};

      controller.handleRequest(request, response, () => {});

      expect(request.parsedUrl).toBe(existingParsedUrl);
      expect(controller._handleRequest).toHaveBeenCalledOnce();
    });
  });

  describe('handleRequest called back more than once', () => {
    it('should ignore a second call to next/done', () => {
      let controller = new Controller();
      controller._handleRequest = (request, response, next) => { next(); next(); };
      let next = vi.fn();

      controller.handleRequest({ url: '/', headers: {} }, {}, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('_negotiateView', () => {
    it('should append to an already-set Vary header instead of replacing it', () => {
      let controller = new Controller({ views: [new View('MyView', 'text/html')] });
      let setHeader = vi.fn();
      let response = { getHeader: () => 'Origin', setHeader };

      controller._negotiateView('MyView', { headers: {} }, response);

      expect(setHeader).toHaveBeenCalledWith('Vary', 'Accept, Origin');
    });

    it('should fall back to the raw MIME type when the matched view has no responseType', () => {
      let controller = new Controller();
      controller._views = { matchView: () => ({ view: {}, type: 'text/plain', responseType: undefined }) };
      let setHeader = vi.fn();
      let response = { getHeader: () => undefined, setHeader };

      controller._negotiateView('MyView', { headers: {} }, response);

      expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    });
  });
});
