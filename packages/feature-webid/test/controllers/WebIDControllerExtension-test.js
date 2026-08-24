/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */

import { describe, it, expect, vi } from 'vitest';
const http = require('http');
const { TLSSocket } = require('tls');
let WebIDControllerExtension = require('../../lib/controllers/WebIDControllerExtension').WebIDControllerExtension; // changed to make tests pass, will be revised in follow up pr

let Controller = require('@ldf/core').controllers.Controller,
    UrlData = require('@ldf/core').UrlData,
    View = require('@ldf/core').views.View,
    ViewCollection = require('@ldf/core').views.ViewCollection;

let { createHttpResponse, withResolvers } = require('../../../../test/test-helpers');

describe('WebIDControllerExtension', () => {
  describe('The WebIDControllerExtension module', () => {
    it('should be a function', () => {
      expect(typeof WebIDControllerExtension).toBe('function');
    });

    it('should be a Controller subclass', () => {
      expect(WebIDControllerExtension.prototype instanceof Controller).toBe(true);
    });
  });

  // lru-cache v5 (this package's pinned dependency) and n3's Parser are both
  // classes, and this file calls both as plain functions; a pre-existing bug
  // that makes the whole feature non-functional, preserved as-is by the TS
  // conversion. The constructor and _verifyWebID both crash unconditionally
  // on their first line before reaching any of their real logic, which is
  // why only _handleRequest and _handleNotAcceptable are testable below.
  // This test documents that current reality rather than the feature
  // actually working, so it fails loudly if that ever changes.
  describe('constructing an instance', () => {
    it('throws, because lru-cache v5 cannot be invoked without `new`', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new WebIDControllerExtension({ urlData: new UrlData({ protocol: 'https' }) });
      }).toThrow(/cannot be invoked without ['"]new['"]/);
    });
  });

  // The methods below are tested by attaching them to a bare object rather
  // than through `new`, since construction itself always throws (see above).
  describe('_handleRequest', () => {
    it('should call next without inspecting the request when the protocol is not https', () => {
      let instance = Object.create(WebIDControllerExtension.prototype);
      instance._protocol = 'http';
      let next = vi.fn();
      instance._handleRequest({}, {}, next);
      expect(next).toHaveBeenCalledOnce();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('_handleNotAcceptable', () => {
    function handle(options) {
      let instance = Object.create(WebIDControllerExtension.prototype);
      let written;
      let response = { writeHead: vi.fn(), end: (text) => { written = text; } };
      instance._handleNotAcceptable({ url: '/foo' }, response, options);
      return written;
    }

    it('should report the WebID and reason from the options', () => {
      expect(handle({ webID: 'http://example.org/#me', reason: 'no match' })).toBe(
        'Access to /foo is not allowed, verification for WebID http://example.org/#me failed. Reason: no match');
    });

    it('should not fail when the WebID and reason are missing', () => {
      expect(handle({})).toBe(
        'Access to /foo is not allowed, verification for WebID  failed. Reason: ');
    });
  });

  describe('_handleForbidden', () => {
    it('should render the Forbidden view with a 401 status', () => {
      let instance = Object.create(WebIDControllerExtension.prototype);
      let view = new View('Forbidden', 'text/plain');
      vi.spyOn(view, 'render').mockImplementation(() => {});
      instance._views = new ViewCollection([view]);
      instance._prefixes = { a: 'b' };
      instance._datasources = { c: 'd' };
      let response = { writeHead: vi.fn(), getHeader: () => undefined, setHeader: () => {} };
      let request = { url: '/foo', headers: {} };

      instance._handleForbidden(request, response, { webID: 'http://example.org/#me', reason: 'no match' });

      expect(response.writeHead).toHaveBeenCalledWith(401);
      expect(view.render).toHaveBeenCalledOnce();
      expect(view.render.mock.calls[0][0]).toEqual({
        url: '/foo', prefixes: { a: 'b' }, datasources: { c: 'd' }, reason: 'no match',
      });
    });
  });

  describe('_handleRequest with an HTTPS protocol', () => {
    it('should throw when the connection is not a TLS socket', () => {
      let instance = Object.create(WebIDControllerExtension.prototype);
      instance._protocol = 'https';
      let request = { connection: {} };

      expect(() => { instance._handleRequest(request, {}, () => {}); })
        .toThrow('Expected a TLS connection, but the socket is not a TLSSocket.');
    });

    function tlsRequest(certificate) {
      let connection = Object.create(TLSSocket.prototype);
      connection.getPeerCertificate = () => certificate;
      return { connection };
    }

    it('should reject the request when the certificate has no WebID subjectAltName', () => {
      let instance = Object.create(WebIDControllerExtension.prototype);
      instance._protocol = 'https';
      instance._handleForbidden = vi.fn();
      let request = tlsRequest({ subject: {} });

      instance._handleRequest(request, {}, () => {});

      expect(instance._handleForbidden).toHaveBeenCalledOnce();
      expect(instance._handleForbidden.mock.calls[0][2]).toEqual({
        reason: 'No WebID found in client certificate.',
      });
    });

    it('should call next when the WebID verifies successfully', () => {
      let instance = Object.create(WebIDControllerExtension.prototype);
      instance._protocol = 'https';
      instance._handleForbidden = vi.fn();
      // eslint-disable-next-line promise/prefer-await-to-callbacks -- mocks _verifyWebID's own callback-based signature
      instance._verifyWebID = vi.fn((webID, modulus, exponent, callback) => callback(null, true));
      let request = tlsRequest({
        subject: { subjectAltName: 'uniformResourceIdentifier:http://example.org/#me' },
        modulus: 'ABCD', exponent: '10001',
      });
      let next = vi.fn();

      instance._handleRequest(request, {}, next);

      expect(instance._verifyWebID).toHaveBeenCalledOnce();
      expect(instance._verifyWebID.mock.calls[0][0]).toBe('http://example.org/#me');
      expect(next).toHaveBeenCalledOnce();
      expect(instance._handleForbidden).not.toHaveBeenCalled();
    });

    it('should reject the request when the WebID does not verify', () => {
      let instance = Object.create(WebIDControllerExtension.prototype);
      instance._protocol = 'https';
      instance._handleForbidden = vi.fn();
      // eslint-disable-next-line promise/prefer-await-to-callbacks -- mocks _verifyWebID's own callback-based signature
      instance._verifyWebID = vi.fn((webID, modulus, exponent, callback) => callback(null, false, 'no match'));
      let request = tlsRequest({
        subject: { subjectAltName: 'uniformResourceIdentifier:http://example.org/#me' },
        modulus: 'ABCD', exponent: '10001',
      });
      let next = vi.fn();

      instance._handleRequest(request, {}, next);

      expect(next).not.toHaveBeenCalled();
      expect(instance._handleForbidden).toHaveBeenCalledOnce();
      expect(instance._handleForbidden.mock.calls[0][2]).toEqual({
        webID: 'http://example.org/#me', reason: 'no match',
      });
    });
  });

  // _verifyWebID is reachable without going through the crashing constructor
  // by providing a `_cache` object directly, the same way _protocol is
  // provided above for _handleRequest.
  describe('_verifyWebID', () => {
    it('should verify successfully against a matching cached id', () => {
      let instance = Object.create(WebIDControllerExtension.prototype);
      instance._cache = { get: () => ({ modulus: 'ABCD', exponent: 65537 }) };
      let callback = vi.fn();

      instance._verifyWebID('http://example.org/#me', 'ABCD', 65537, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should report a mismatch against a non-matching cached id', () => {
      let instance = Object.create(WebIDControllerExtension.prototype);
      instance._cache = { get: () => ({ modulus: 'WRONG', exponent: 1 }) };
      let callback = vi.fn();

      instance._verifyWebID('http://example.org/#me', 'ABCD', 65537, callback);

      expect(callback).toHaveBeenCalledWith(null, false,
        'WebID does not match certificate: WRONG - 1 (webid) <> ABCD - 65537 (cert)');
    });

    // TODO: the predicate switch in _verifyWebID compares an N3 term object
    // against string literals with ===, which never matches, so the fetched
    // modulus/exponent always come out empty regardless of what the WebID
    // document actually contains.
    describe('on a cache miss', () => {
      it('should always report a mismatch, since the parsed modulus/exponent are never populated', async () => {
        let instance = Object.create(WebIDControllerExtension.prototype);
        instance._cache = { get: () => undefined, set: vi.fn() };
        let originalRequest = http.request;
        // Mocks http.request's own callback-based signature.
        /* eslint-disable promise/prefer-await-to-callbacks */
        http.request = (url, cb) => {
          cb(createHttpResponse(
            '@prefix cert: <http://www.w3.org/ns/auth/cert#> . ' +
            '<http://example.org/#me> cert:modulus "00:AB:CD" ; cert:exponent "65537" .',
            'text/turtle'));
          return { on: () => {}, end: () => {} };
        };
        /* eslint-enable promise/prefer-await-to-callbacks */

        let { promise, resolve } = withResolvers();
        // eslint-disable-next-line promise/prefer-await-to-callbacks -- _verifyWebID's own signature is callback-based
        instance._verifyWebID('http://example.org/#me', 'ABCD', 65537, (error, verified, reason) => {
          http.request = originalRequest;
          resolve({ error, verified, reason });
        });
        let { error, verified, reason } = await promise;
        expect(error).toBe(null);
        expect(verified).toBe(false);
        expect(reason).toBe('WebID does not match certificate: undefined - undefined (webid) <> ABCD - 65537 (cert)');
        expect(instance._cache.set).toHaveBeenCalledWith('http://example.org/#me', {}, expect.anything());
      });

      it('should report the download error when the request fails', async () => {
        let instance = Object.create(WebIDControllerExtension.prototype);
        instance._cache = { get: () => undefined };
        let originalRequest = http.request;
        http.request = () => {
          return {
            on: (event, handler) => { if (event === 'error') setImmediate(() => handler(new Error('connect failed'))); },
            end: () => {},
          };
        };

        let { promise, resolve } = withResolvers();
        // eslint-disable-next-line promise/prefer-await-to-callbacks -- _verifyWebID's own signature is callback-based
        instance._verifyWebID('http://example.org/#me', 'ABCD', 65537, (error, verified, reason) => {
          http.request = originalRequest;
          resolve({ error, verified, reason });
        });
        let { error, verified, reason } = await promise;
        expect(error).toBe(null);
        expect(verified).toBe(false);
        expect(reason).toBe('Unabled to download http://example.org/#me (connect failed).');
      });
    });
  });
});
