/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect } from 'vitest';
import { parse as parseUrl } from 'url';
import { DatasourceRouter } from '../../lib/routers/DatasourceRouter';
import { UrlData, type Query } from '../../index';

describe('DatasourceRouter', () => {
  describe('The DatasourceRouter module', () => {
    it('should be a function', () => {
      expect(typeof DatasourceRouter).toBe('function');
    });

    it('should be a DatasourceRouter constructor', () => {
      expect(new DatasourceRouter()).toBeInstanceOf(DatasourceRouter);
    });
  });

  describe('A DatasourceRouter instance', () => {
    let router = new DatasourceRouter();

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        it('a root URL without trailing slash or query parameters should extract the index datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/' });
        });

        it('a root URL without query parameters should extract the index datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/' });
        });

        it('a root URL with query parameters should extract the index datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?a=b&c=d', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/' });
        });

        it('a URL with word characters without query parameters should extract the datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/mydatasource', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/mydatasource' });
        });

        it('a URL with word characters with query parameters should extract the datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/mydatasource?a=b&c=d', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/mydatasource' });
        });

        it('a URL with word and non-word characters without query parameters should extract the datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/my/data-source', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/my/data-source' });
        });

        it('a URL with word and non-word characters with query parameters should extract the datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/my/data-source?a=b&c=d', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/my/data-source' });
        });
      });
    });
  });

  describe('A DatasourceRouter instance with a base URL', () => {
    let router = new DatasourceRouter({
      urlData: new UrlData({ baseURL: '/my/base' }),
    });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        it('a root URL should extract the index datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/my/base/', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/' });
        });

        it('a non-root URL should extract the index datasource', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/my/base/other/path', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { datasource: true }, datasource: '/other/path' });
        });
      });
    });
  });
});
