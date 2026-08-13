/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */

import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
let WebIDControllerExtension = require('../../lib/controllers/WebIDControllerExtension').WebIDControllerExtension; // changed to make tests pass, will be revised in follow up pr

let Controller = require('@ldf/core').controllers.Controller,
    UrlData = require('@ldf/core').UrlData;

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
      let next = sinon.spy();
      instance._handleRequest({}, {}, next);
      expect(next.calledOnce).toBe(true);
      expect(next.calledWithExactly()).toBe(true);
    });
  });

  describe('_handleNotAcceptable', () => {
    function handle(options) {
      let instance = Object.create(WebIDControllerExtension.prototype);
      let written;
      let response = { writeHead: sinon.spy(), end: (text) => { written = text; } };
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
});
