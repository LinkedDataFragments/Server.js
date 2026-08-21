/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
import { describe, it, expect } from 'vitest';
let UrlData = require('../lib/UrlData').UrlData;

describe('UrlData', () => {
  it('should be a function', () => {
    expect(typeof UrlData).toBe('function');
  });

  describe('with no options', () => {
    let urlData = new UrlData();

    it('should default baseURL to /', () => {
      expect(urlData.baseURL).toBe('/');
    });

    it('should default protocol to http', () => {
      expect(urlData.protocol).toBe('http');
    });
  });

  describe('with a baseURL that includes a host', () => {
    let urlData = new UrlData({ baseURL: 'https://example.org/base' });

    it('should split baseURLRoot and baseURLPath', () => {
      expect(urlData.baseURLRoot).toBe('https://example.org');
      expect(urlData.baseURLPath).toBe('/base/');
    });

    it('should derive a well-known blank node path and prefix', () => {
      expect(urlData.blankNodePath).toBe('/.well-known/genid/');
      expect(urlData.blankNodePrefix).toBe('https://example.org/.well-known/genid/');
      expect(urlData.blankNodePrefixLength).toBe(urlData.blankNodePrefix.length);
    });

    it('should infer the protocol from the baseURL', () => {
      expect(urlData.protocol).toBe('https');
    });
  });

  describe('with a baseURL that has no host (relative)', () => {
    let urlData = new UrlData({ baseURL: '/base/' });

    it('should leave baseURLRoot empty', () => {
      expect(urlData.baseURLRoot).toBe('');
    });

    it('should leave the blank node path empty and use the genid: prefix instead', () => {
      expect(urlData.blankNodePath).toBe('');
      expect(urlData.blankNodePrefix).toBe('genid:');
    });

    it('should default the protocol to http, since there is none to infer', () => {
      expect(urlData.protocol).toBe('http');
    });
  });

  it('should use an explicit protocol option over an inferred one', () => {
    let urlData = new UrlData({ baseURL: 'https://example.org/', protocol: 'http' });
    expect(urlData.protocol).toBe('http');
  });

  // TODO: assetsPath is always computed from baseURLPath + 'assets/', never
  // empty, so the `|| options.assetsPath` fallback is silently unreachable.
  it('should ignore an explicit assetsPath option', () => {
    let urlData = new UrlData({ baseURL: '/base/', assetsPath: '/custom-assets/' });
    expect(urlData.assetsPath).toBe('/base/assets/');
  });
});
