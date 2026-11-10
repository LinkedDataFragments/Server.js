/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect } from 'vitest';
import { parse as parseUrl } from 'url';
import { routers } from '../../index';
import type { Query } from '@ldf/core';
import { DataFactory as dataFactory } from 'n3';

const { QuadPatternRouter } = routers;

describe('QuadPatternRouter', () => {
  describe('The QuadPatternRouter module', () => {
    it('should be a function', () => {
      expect(typeof QuadPatternRouter).toBe('function');
    });

    it('should be a QuadPatternRouter constructor', () => {
      expect(new QuadPatternRouter({})).toBeInstanceOf(QuadPatternRouter);
    });
  });

  describe('A QuadPatternRouter instance', () => {
    let router = new QuadPatternRouter({ dataFactory });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        it('a URL without query parameters should not change the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an empty subject parameter should not add the subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an IRI subject parameter should add the subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=http%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with an IRI subject parameter in angular brackets should add the subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a variable subject parameter should not add the subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=%3Ffoo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with a blank subject parameter should not add the subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=_:foo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with a literal subject parameter should not add the subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=%22foo%22', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an empty predicate parameter should not add the predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an IRI predicate parameter should add the predicate to the query', () => {
          let query = { a: 1, features: { a: true } };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=http%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { a: true, triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with an IRI predicate parameter in angular brackets should add the predicate to the query', () => {
          let query = { a: 1, features: { a: true } };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { a: true, triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a variable predicate parameter should not add the predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=%3Ffoo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with a blank predicate parameter should not add the predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=_:foo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with a literal predicate parameter should not add the predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=%22foo%22', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an empty object parameter should not add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an IRI object parameter should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=http%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with an IRI object parameter in angular brackets should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a variable object parameter should not add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%3Ffoo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with a blank object parameter should not add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=_:foo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with a literal object parameter should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%22foo%22', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo') });
        });

        it('a URL with a language literal object parameter should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%22foo%22@nl-be', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', 'nl-be') });
        });

        it('a URL with a typed literal object parameter should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%22foo%22%5E%5Ehttp%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) });
        });

        it('a URL with a typed literal object parameter in angular brackets should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%22foo%22%5E%5E%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) });
        });

        it('a URL with an empty graph parameter should not add the graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an IRI graph parameter should add the graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=http%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with an IRI graph parameter in angular brackets should add the graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a variable graph parameter should not add the graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=%3Ffoo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with a blank graph parameter should not add the graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=_:foo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with a literal graph parameter should not add the graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=%22foo%22', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('the default graph as graph parameter should add the default graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=urn%3Aldf%3AdefaultGraph', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.defaultGraph() });
        });
      });
    });
  });

  describe('A QuadPatternRouter instance with prefixes', () => {
    let router = new QuadPatternRouter({
      prefixes: {
        foo:  'http://example.org/foo#',
        http: 'http://www.w3.org/2011/http#',
      },
      dataFactory,
    });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        it('a URL without query parameters should not change the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an empty subject parameter should not add the subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an IRI subject parameter should add the subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=http%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name subject parameter should add the expanded subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=foo%3Abar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name subject parameter with the "http" prefix should add the expanded subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=http%3AConnection', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://www.w3.org/2011/http#Connection') });
        });

        it('a URL with a prefixed name subject parameter with an unknown prefix should add the non-expanded subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=bar%3Afoo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('bar:foo') });
        });

        it('a URL with an IRI subject parameter in angular brackets should add the non-expanded subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name subject parameter in angular brackets should add the non-expanded subject to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?subject=%3Cfoo%3Abar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('foo:bar') });
        });

        it('a URL with an empty predicate parameter should not add the predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an IRI predicate parameter should add the predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=http%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name predicate parameter should add the expanded predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=foo%3Abar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name predicate parameter with the "http" prefix should add the expanded predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=http%3Aauthority', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('http://www.w3.org/2011/http#authority') });
        });

        it('a URL with a prefixed name predicate parameter with an unknown prefix should add the non-expanded predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=bar%3Afoo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('bar:foo') });
        });

        it('a URL with an IRI predicate parameter in angular brackets should add the non-expanded predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name predicate parameter in angular brackets should add the non-expanded predicate to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?predicate=%3Cfoo%3Abar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('foo:bar') });
        });

        it('a URL with an empty object parameter should not add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an IRI object parameter should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=http%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name object parameter should add the expanded object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=foo%3Abar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name object parameter with the "http" prefix should add the expanded object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=http%3AConnection', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://www.w3.org/2011/http#Connection') });
        });

        it('a URL with a prefixed name object parameter with an unknown prefix should add the non-expanded object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=bar%3Afoo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('bar:foo') });
        });

        it('a URL with an IRI object parameter in angular brackets should add the non-expanded object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name object parameter in angular brackets should add the non-expanded object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%3Cfoo%3Abar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('foo:bar') });
        });

        it('a URL with a typed literal object parameter should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%22foo%22%5E%5Ehttp%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) });
        });

        it('a URL with a typed literal object parameter in angular brackets should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%22foo%22%5E%5E%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) });
        });

        it('a URL with a prefixed literal object parameter should add the object to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?object=%22foo%22%5E%5Efoo%3Abar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) });
        });

        it('a URL with an empty graph parameter should not add the graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1 });
        });

        it('a URL with an IRI graph parameter should add the graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=http%3A%2F%2Fexample.org%2Ffoo%23bar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name graph parameter should add the expanded graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=foo%3Abar', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name graph parameter with the "http" prefix should add the expanded graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=http%3AConnection', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://www.w3.org/2011/http#Connection') });
        });

        it('a URL with a prefixed name graph parameter with an unknown prefix should add the non-expanded graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=bar%3Afoo', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('bar:foo') });
        });

        it('a URL with an IRI graph parameter in angular brackets should add the non-expanded graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') });
        });

        it('a URL with a prefixed name graph parameter in angular brackets should add the non-expanded graph to the query', () => {
          let query = { a: 1 };
          const result = router.extractQueryParams({ url: parseUrl('http://example.org/?graph=%3Cfoo%3Abar%3E', true) }, query as Query);
          expect(result, 'should not return anything').toBeUndefined();
          expect(query, 'should match the expected query').toEqual({ a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('foo:bar') });
        });
      });
    });
  });
});
