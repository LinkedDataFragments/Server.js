/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect } from 'vitest';
import { extractQueryParams } from '../../../../test/test-helpers';
import { PageRouter } from '../../lib/routers/PageRouter';
import type { Query } from '../../index';

describe('PageRouter', () => {
  describe('The PageRouter module', () => {
    it('should be a function', () => {
      expect(typeof PageRouter).toBe('function');
    });

    it('should be a PageRouter constructor', () => {
      expect(new PageRouter()).toBeInstanceOf(PageRouter);
    });
  });

  describe('A PageRouter instance', () => {
    let router = new PageRouter();

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        (
          [
            [
              'a URL without query parameters',
              'http://example.org/',
              'should add the default page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 100 },
            ],
            [
              'a URL with an empty page parameter',
              'http://example.org/?page=',
              'should add the default page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 100 },
            ],
            [
              'a URL with a non-numerical page parameter',
              'http://example.org/?page=foo',
              'should add the default page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 100 },
            ],
            [
              'a URL with -1 as page parameter',
              'http://example.org/?page=-1',
              'should add the default page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 100 },
            ],
            [
              'a URL with 0 as page parameter',
              'http://example.org/?page=0',
              'should add the default page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 100 },
            ],
            [
              'a URL with 1 as page parameter',
              'http://example.org/?page=1',
              'should add the default page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 100 },
            ],
            [
              'a URL with 2 as page parameter',
              'http://example.org/?page=2',
              'should add the default page size as limit and set the offset',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true, offset: true }, limit: 100, offset: 100 },
            ],
            [
              'a URL with 3 as page parameter',
              'http://example.org/?page=3',
              'should add the default page size as limit and set the offset',
              { patternString: 'x', features: { a: true, b: true } },
              { patternString: 'x', features: { a: true, b: true, limit: true, offset: true }, limit: 100, offset: 200 },
            ],
          ] as Array<[string, string, string, Query, Query]>
        )
          .forEach((args) => { extractQueryParams(router, ...args); });
      });
    });
  });

  describe('A PageRouter instance with a given page size', () => {
    let router = new PageRouter({ pageSize: 250 });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        (
          [
            [
              'a URL without query parameters',
              'http://example.org/',
              'should add the page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 250 },
            ],
            [
              'a URL with an empty page parameter',
              'http://example.org/?page=',
              'should add the page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 250 },
            ],
            [
              'a URL with a non-numerical page parameter',
              'http://example.org/?page=foo',
              'should add the page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 250 },
            ],
            [
              'a URL with -1 as page parameter',
              'http://example.org/?page=-1',
              'should add the page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 250 },
            ],
            [
              'a URL with 0 as page parameter',
              'http://example.org/?page=0',
              'should add the page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 250 },
            ],
            [
              'a URL with 1 as page parameter',
              'http://example.org/?page=1',
              'should add the page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 250 },
            ],
            [
              'a URL with 2 as page parameter',
              'http://example.org/?page=2',
              'should add the page size as limit and set the offset',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true, offset: true }, limit: 250, offset: 250 },
            ],
            [
              'a URL with 3 as page parameter',
              'http://example.org/?page=3',
              'should add the page size as limit and set the offset',
              { patternString: 'x', features: { a: true, b: true } },
              { patternString: 'x', features: { a: true, b: true, limit: true, offset: true }, limit: 250, offset: 500 },
            ],
          ] as Array<[string, string, string, Query, Query]>
        )
          .forEach((args) => { extractQueryParams(router, ...args); });
      });
    });
  });

  describe('A PageRouter instance with an invalid page size', () => {
    let router = new PageRouter({ pageSize: -1 });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        (
          [
            [
              'a URL without query parameters',
              'http://example.org/',
              'should add the default page size as limit',
              { patternString: 'x' },
              { patternString: 'x', features: { limit: true }, limit: 100 },
            ],
          ] as Array<[string, string, string, Query, Query]>
        )
          .forEach((args) => { extractQueryParams(router, ...args); });
      });
    });
  });
});
