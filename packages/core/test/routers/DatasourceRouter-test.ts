/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect } from 'vitest';
import { extractQueryParams } from '../../../../test/test-helpers';
import { DatasourceRouter } from '../../lib/routers/DatasourceRouter';
import { UrlData } from '../../index';
import type { Query } from '../../index';

// Query has no index signature; this lets the test tables below use an
// arbitrary 'a' field as a stand-in for "pre-existing data that should survive".
type TestQuery = Query & { a?: number };
type QueryParamsTestCase = [string, string, string, TestQuery, TestQuery];

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
        const rows: QueryParamsTestCase[] = [
          [
            'a root URL without trailing slash or query parameters',
            'http://example.org',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a root URL without query parameters',
            'http://example.org/',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a root URL with query parameters',
            'http://example.org/?a=b&c=d',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a URL with word characters without query parameters',
            'http://example.org/mydatasource',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/mydatasource' },
          ],
          [
            'a URL with word characters with query parameters',
            'http://example.org/mydatasource?a=b&c=d',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/mydatasource' },
          ],
          [
            'a URL with word and non-word characters without query parameters',
            'http://example.org/my/data-source',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/my/data-source' },
          ],
          [
            'a URL with word and non-word characters with query parameters',
            'http://example.org/my/data-source?a=b&c=d',
            'should extract the datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/my/data-source' },
          ],
        ];
        rows.forEach((args) => { extractQueryParams(router, ...args); });
      });
    });
  });

  describe('A DatasourceRouter instance with a base URL', () => {
    let router = new DatasourceRouter({
      urlData: new UrlData({ baseURL: '/my/base' }),
    });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        const rows: QueryParamsTestCase[] = [
          [
            'a root URL',
            'http://example.org/my/base/',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/' },
          ],
          [
            'a non-root URL',
            'http://example.org/my/base/other/path',
            'should extract the index datasource',
            { a: 1 },
            { a: 1, features: { datasource: true }, datasource: '/other/path' },
          ],
        ];
        rows.forEach((args) => { extractQueryParams(router, ...args); });
      });
    });
  });
});
