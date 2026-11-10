/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect } from 'vitest';
import { parse as parseUrl } from 'url';
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
        it('a URL without query parameters should add the default page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 100 });
        });

        it('a URL with an empty page parameter should add the default page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 100 });
        });

        it('a URL with a non-numerical page parameter should add the default page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=foo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 100 });
        });

        it('a URL with -1 as page parameter should add the default page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=-1', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 100 });
        });

        it('a URL with 0 as page parameter should add the default page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=0', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 100 });
        });

        it('a URL with 1 as page parameter should add the default page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=1', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 100 });
        });

        it('a URL with 2 as page parameter should add the default page size as limit and set the offset', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=2', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true, offset: true }, limit: 100, offset: 100 });
        });

        it('a URL with 3 as page parameter should add the default page size as limit and set the offset', () => {
          let query = { a: 1, features: { a: true, b: true } };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=3', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { a: true, b: true, limit: true, offset: true }, limit: 100, offset: 200 });
        });
      });
    });
  });

  describe('A PageRouter instance with a given page size', () => {
    let router = new PageRouter({ pageSize: 250 });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        it('a URL without query parameters should add the page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 250 });
        });

        it('a URL with an empty page parameter should add the page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 250 });
        });

        it('a URL with a non-numerical page parameter should add the page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=foo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 250 });
        });

        it('a URL with -1 as page parameter should add the page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=-1', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 250 });
        });

        it('a URL with 0 as page parameter should add the page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=0', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 250 });
        });

        it('a URL with 1 as page parameter should add the page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=1', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 250 });
        });

        it('a URL with 2 as page parameter should add the page size as limit and set the offset', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=2', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true, offset: true }, limit: 250, offset: 250 });
        });

        it('a URL with 3 as page parameter should add the page size as limit and set the offset', () => {
          let query = { a: 1, features: { a: true, b: true } };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?page=3', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { a: true, b: true, limit: true, offset: true }, limit: 250, offset: 500 });
        });
      });
    });
  });

  describe('A PageRouter instance with an invalid page size', () => {
    let router = new PageRouter({ pageSize: -1 });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        it('a URL without query parameters should add the default page size as limit', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { limit: true }, limit: 100 });
        });
      });
    });
  });
});
