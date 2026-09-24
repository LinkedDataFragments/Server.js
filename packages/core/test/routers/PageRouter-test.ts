/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect } from 'vitest';
import { extractQueryParams } from '../../../../test/test-helpers';
import { PageRouter } from '../../lib/routers/PageRouter';
import type { Query } from '../../index';

// Query has no index signature; this lets the test tables below use an
// arbitrary 'a' field as a stand-in for "pre-existing data that should survive".
type TestQuery = Query & { a?: number };
type QueryParamsTestCase = [string, string, string, TestQuery, TestQuery];

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
        const rows: QueryParamsTestCase[] = [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with an empty page parameter',
            'http://example.org/?page=',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with a non-numerical page parameter',
            'http://example.org/?page=foo',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with -1 as page parameter',
            'http://example.org/?page=-1',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with 0 as page parameter',
            'http://example.org/?page=0',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with 1 as page parameter',
            'http://example.org/?page=1',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with 2 as page parameter',
            'http://example.org/?page=2',
            'should add the default page size as limit and set the offset',
            { a: 1 },
            { a: 1, features: { limit: true, offset: true }, limit: 100, offset: 100 },
          ],
          [
            'a URL with 3 as page parameter',
            'http://example.org/?page=3',
            'should add the default page size as limit and set the offset',
            { a: 1, features: { a: true, b: true } },
            { a: 1, features: { a: true, b: true, limit: true, offset: true }, limit: 100, offset: 200 },
          ],
        ];
        rows.forEach((args) => { extractQueryParams(router, ...args); });
      });
    });
  });

  describe('A PageRouter instance with a given page size', () => {
    let router = new PageRouter({ pageSize: 250 });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        const rows: QueryParamsTestCase[] = [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with an empty page parameter',
            'http://example.org/?page=',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with a non-numerical page parameter',
            'http://example.org/?page=foo',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with -1 as page parameter',
            'http://example.org/?page=-1',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with 0 as page parameter',
            'http://example.org/?page=0',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with 1 as page parameter',
            'http://example.org/?page=1',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with 2 as page parameter',
            'http://example.org/?page=2',
            'should add the page size as limit and set the offset',
            { a: 1 },
            { a: 1, features: { limit: true, offset: true }, limit: 250, offset: 250 },
          ],
          [
            'a URL with 3 as page parameter',
            'http://example.org/?page=3',
            'should add the page size as limit and set the offset',
            { a: 1, features: { a: true, b: true } },
            { a: 1, features: { a: true, b: true, limit: true, offset: true }, limit: 250, offset: 500 },
          ],
        ];
        rows.forEach((args) => { extractQueryParams(router, ...args); });
      });
    });
  });

  describe('A PageRouter instance with an invalid page size', () => {
    let router = new PageRouter({ pageSize: -1 });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        const rows: QueryParamsTestCase[] = [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
        ];
        rows.forEach((args) => { extractQueryParams(router, ...args); });
      });
    });
  });
});
