/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
const sinon = require('sinon');
import { createHttpResponse, streamLength } from '../../../../test/test-helpers';
let SparqlDatasource = require('../../').datasources.SparqlDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    fs = require('fs'),
    path = require('path'),
    URL = require('url'),
    dataFactory = require('n3').DataFactory;

let jsonResult = fs.readFileSync(path.join(__dirname, '../../../../test/assets/sparql-quads-response.json'));
let countResult = '"c"\n12345678\n';

describe('SparqlDatasource', () => {
  describe('The SparqlDatasource module', () => {
    it('should be a function', () => {
      expect(typeof SparqlDatasource).toBe('function');
    });

    it('should be a SparqlDatasource constructor', () => {
      expect(new SparqlDatasource({ dataFactory })).toBeInstanceOf(SparqlDatasource);
    });

    it('should create Datasource objects', () => {
      expect(new SparqlDatasource({ dataFactory })).toBeInstanceOf(Datasource);
    });

    it('should not throw when constructed without options', () => {
      expect(() => new SparqlDatasource()).not.toThrow();
    });
  });

  describe('A SparqlDatasource instance', () => {
    let request = sinon.stub();
    let datasource = new SparqlDatasource({ dataFactory, endpoint: 'http://ex.org/sparql', request: request });
    datasource.initialize();

    it('should indicate support for its features', () => {
      expect(datasource.supportedFeatures).toEqual({
        triplePattern: true,
        quadPattern: true,
        limit: true,
        offset: true,
        totalCount: true,
      });
    });

    it('should support the empty query', () => {
      expect(datasource.supportsQuery({})).toBe(true);
    });

    it('should support a query with supported features', () => {
      expect(datasource.supportsQuery({ features: { limit: true, offset: true, b: false } })).toBe(true);
    });

    it('should not support a query with unsupported features', () => {
      expect(datasource.supportsQuery({ features: { limit: true, b: true } })).toBe(false);
    });

    it('should throw an error when trying to execute an unsupported query', () => new Promise((done) => {
      datasource.select({ features: { a: true, b: true } }, (error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty('message', 'The datasource does not support the given query');
        done();
      });
    }));

    itShouldExecute(datasource, request,
      'the empty query',
      { features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p ?o}}');

    itShouldExecute(datasource, request,
      'an empty query with a limit',
      { limit: 100, features: { limit: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p ?o}} LIMIT 100',
      null /* count should be cached, since this pattern already occurred above */);

    itShouldExecute(datasource, request,
      'an empty query with a limit and an offset',
      { limit: 100, offset: 200, features: { limit: true, offset: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p ?o}} LIMIT 100 OFFSET 200',
      null /* count should be cached, since this pattern already occurred above */);

    itShouldExecute(datasource, request,
      'a query for a subject IRI',
      { subject: dataFactory.namedNode('http://example.org/bar#foo'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{<http://example.org/bar#foo> ?p ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{<http://example.org/bar#foo> ?p ?o}}');

    itShouldExecute(datasource, request,
      'a query for a predicate IRI',
      { predicate: dataFactory.namedNode('http://example.org/bar#foo'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s <http://example.org/bar#foo> ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s <http://example.org/bar#foo> ?o}}');

    itShouldExecute(datasource, request,
      'a query for an object IRI',
      { object: dataFactory.namedNode('http://example.org/bar#foo'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p <http://example.org/bar#foo>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p <http://example.org/bar#foo>}}');

    itShouldExecute(datasource, request,
      'a query for an object literal',
      { object: dataFactory.literal('a literal'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p "a literal"}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with newlines and quotes',
      { object: dataFactory.literal('a\rb\nc"\r\n\\"'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p """a\rb\nc\\"\r\n\\\\\\""""}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p """a\rb\nc\\"\r\n\\\\\\""""}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with a language',
      { object: dataFactory.literal('a literal', 'nl-be'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p "a literal"@nl-be}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"@nl-be}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with a type',
      { object: dataFactory.literal('a literal', dataFactory.namedNode('http://ex.org/foo#literal')), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p "a literal"^^<http://ex.org/foo#literal>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"^^<http://ex.org/foo#literal>}}');

    itShouldExecute(datasource, request,
      'a query for a predicate and object URI',
      { predicate: dataFactory.namedNode('http://example.org/bar#foo'),
        object: dataFactory.namedNode('http://example.org/baz#bar'),
        features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}}');

    itShouldExecute(datasource, request,
      'a query for a predicate and object URI with offset and limit',
      { predicate: dataFactory.namedNode('http://example.org/bar#foo'),
        object: dataFactory.namedNode('http://example.org/baz#bar'),
        limit: 50, offset: 150,
        features: { quadPattern: true, offset: true, limit: true } },
      'SELECT * WHERE {GRAPH ?g{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}} ' +
          'LIMIT 50 OFFSET 150',
      null /* count should be cached, since this pattern already occurred above */);

    itShouldExecute(datasource, request,
      'a query for a predicate and object URI for the default graph',
      { predicate: dataFactory.namedNode('http://example.org/bar#foo'),
        object: dataFactory.namedNode('http://example.org/baz#bar'),
        graph: dataFactory.defaultGraph(),
        features: { quadPattern: true } },
      'SELECT * WHERE {?s <http://example.org/bar#foo> <http://example.org/baz#bar>}',
      'SELECT (COUNT(*) AS ?c) WHERE {?s <http://example.org/bar#foo> <http://example.org/baz#bar>}');

    itShouldExecute(datasource, request,
      'a query for a predicate and object URI for the default graph with offset and limit',
      { predicate: dataFactory.namedNode('http://example.org/bar#foo'),
        object: dataFactory.namedNode('http://example.org/baz#bar'),
        graph: dataFactory.defaultGraph(),
        limit: 50, offset: 150,
        features: { quadPattern: true, offset: true, limit: true } },
      'SELECT * WHERE {?s <http://example.org/bar#foo> <http://example.org/baz#bar>} ' +
      'LIMIT 50 OFFSET 150',
      null /* count should be cached, since this pattern already occurred above */);

    itShouldExecute(datasource, request,
      'a query for a graph IRI',
      { graph: dataFactory.namedNode('http://dbpedia.org'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH <http://dbpedia.org>{?s ?p ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH <http://dbpedia.org>{?s ?p ?o}}');

    itShouldExecute(datasource, request,
      'a query for a predicate and graph IRI',
      { predicate: dataFactory.namedNode('http://example.org/bar#foo'),
        graph: dataFactory.namedNode('http://dbpedia.org'),
        features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> ?o}}');

    itShouldExecute(datasource, request,
      'a query for a predicate, object and graph URI',
      { predicate: dataFactory.namedNode('http://example.org/bar#foo'),
        object: dataFactory.namedNode('http://example.org/baz#bar'),
        graph: dataFactory.namedNode('http://dbpedia.org'),
        features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}}',
      'SELECT (COUNT(*) AS ?c) ' +
        'WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}}');

    itShouldExecute(datasource, request,
      'a query for a predicate, object and graph URI with offset and limit',
      { predicate: dataFactory.namedNode('http://example.org/bar#foo'),
        object: dataFactory.namedNode('http://example.org/baz#bar'),
        graph: dataFactory.namedNode('http://dbpedia.org'),
        limit: 50, offset: 150,
        features: { quadPattern: true, offset: true, limit: true } },
      'SELECT * WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}} ' +
      'LIMIT 50 OFFSET 150',
      null /* count should be cached, since this pattern already occurred above */);

    describe('when invalid JSON is returned in response to the data query', () => {
      let result, error;
      beforeAll(() => new Promise((done) => {
        request.reset();
        request.onFirstCall().returns(createHttpResponse('invalid', 'application/sparql-results+json'));
        request.onSecondCall().returns(createHttpResponse(countResult, 'text/csv'));
        let query = { subject: dataFactory.namedNode('abcd'), features: { quadPattern: true } };
        result = datasource.select(query);
        result.on('error', (e) => { error = e; done(); });
      }));

      it('should emit an error', () => {
        expect(error).toHaveProperty('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: The endpoint returned an invalid SPARQL results JSON response.');
      });
    });

    describe('when invalid JSON is returned in response to the count query', () => {
      let result, error;
      beforeAll(() => new Promise((done) => {
        request.reset();
        request.onFirstCall().returns(createHttpResponse(jsonResult, 'application/sparql-results+json'));
        request.onSecondCall().returns(createHttpResponse('invalid', 'application/trig'));
        let query = { subject: dataFactory.namedNode('abcde'), features: { quadPattern: true } };
        result = datasource.select(query);
        result.on('error', (e) => { error = e; done(); });
      }));

      it('should emit an error', () => {
        expect(error).toHaveProperty('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: COUNT query failed.');
      });
    });

    describe('when the data query request errors', () => {
      let result, error;
      beforeAll(() => new Promise((done) => {
        request.reset();
        let query = { subject: dataFactory.namedNode('abcde'), features: { quadPattern: true } };
        result = datasource.select(query);
        result.on('error', (e) => { error = e; done(); });
        request.getCall(0).callArgWith(1, Error('query response error'));
      }));

      it('should emit an error', () => {
        expect(error).toHaveProperty('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: query response error');
      });
    });

    describe('when the count query request errors', () => {
      let totalCount;
      beforeAll(() => new Promise((resolve) => {
        request.reset();
        let query = { subject: dataFactory.namedNode('abcdef'), features: { quadPattern: true } };
        let result = datasource.select(query);
        request.returnValues[1].emit('error', new Error());
        result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; resolve(); });
      }));

      it('should emit a high count estimate', () => {
        expect(totalCount).toBe(1e9);
      });
    });
  });

  describe('A SparqlDatasource instance with forceTypedLiterals true', () => {
    let request = sinon.stub();
    let datasource = new SparqlDatasource({ dataFactory, endpoint: 'http://ex.org/sparql', request: request, forceTypedLiterals: true });
    datasource.initialize();

    itShouldExecute(datasource, request,
      'a query for an object IRI',
      { object: dataFactory.namedNode('http://example.org/bar#foo'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p <http://example.org/bar#foo>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p <http://example.org/bar#foo>}}');

    itShouldExecute(datasource, request,
      'a query for an object literal',
      { object: dataFactory.literal('a literal'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p "a literal"^^<http://www.w3.org/2001/XMLSchema#string>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"^^<http://www.w3.org/2001/XMLSchema#string>}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with newlines and quotes',
      { object: dataFactory.literal('a\rb\nc"\r\n\\"'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p """a\rb\nc\\"\r\n\\\\\\""""^^<http://www.w3.org/2001/XMLSchema#string>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p """a\rb\nc\\"\r\n\\\\\\""""^^<http://www.w3.org/2001/XMLSchema#string>}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with a language',
      { object: dataFactory.literal('a literal', 'nl-be'), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p "a literal"@nl-be}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"@nl-be}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with a type',
      { object: dataFactory.literal('a literal', dataFactory.namedNode('http://ex.org/foo#literal')), features: { quadPattern: true } },
      'SELECT * WHERE {GRAPH ?g{?s ?p "a literal"^^<http://ex.org/foo#literal>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"^^<http://ex.org/foo#literal>}}');
  });

  describe('_encodeObject', () => {
    let datasource = new SparqlDatasource({ dataFactory, endpoint: 'http://ex.org/sparql' });

    it('should encode a blank node', () => {
      expect(datasource._encodeObject(dataFactory.blankNode('b1'))).toBe('_:b1');
    });

    it('should encode the default graph as an empty string', () => {
      expect(datasource._encodeObject(dataFactory.defaultGraph())).toBe('');
    });

    it('should return null for an unrecognized term type', () => {
      expect(datasource._encodeObject({ termType: 'Quad' })).toBe(null);
    });

    it('should encode a variable', () => {
      expect(datasource._encodeObject(dataFactory.variable('x'))).toBe('?x');
    });
  });

  describe('_convertLiteral', () => {
    let datasource = new SparqlDatasource({ dataFactory, endpoint: 'http://ex.org/sparql' });

    it('should return the ?o variable when no literal is given', () => {
      expect(datasource._convertLiteral()).toBe('?o');
    });
  });

  describe('_getPatternCount', () => {
    it('should return the default estimate without querying when a count for the same pattern is already resolving', () => {
      let datasource = new SparqlDatasource({ dataFactory, endpoint: 'http://ex.org/sparql', request: sinon.stub() });
      datasource._resolvingCountQueries['{ ?s ?p ?o }'] = true;

      return datasource._getPatternCount('{ ?s ?p ?o }').then((estimate) => {
        expect(estimate).toEqual({ totalCount: 1e9, hasExactCount: false });
        expect(datasource._request.called).toBe(false);
      });
    });
  });
});

function itShouldExecute(datasource, request, name, query, constructQuery, countQuery) {
  describe('executing ' + name, () => {
    let result, totalCount;
    beforeAll(() => new Promise((resolve) => {
      request.reset();
      request.onFirstCall().returns(createHttpResponse(jsonResult, 'application/sparql-results+json'));
      request.onSecondCall().returns(createHttpResponse(countResult, 'text/csv'));
      result = datasource.select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; resolve(); });
    }));

    it('should request a matching CONSTRUCT query', () => {
      expect(request.called).toBe(true);
      let url = URL.parse(request.firstCall.args[0].url, true);
      expect(url.protocol + '//' + url.host + url.pathname).toBe('http://ex.org/sparql');
      expect(url.query.query).toBe(constructQuery);
    });

    if (countQuery) {
      it('should request a matching COUNT query', () => {
        expect(request.calledTwice).toBe(true);
        let url = URL.parse(request.secondCall.args[0].url, true);
        expect(url.protocol + '//' + url.host + url.pathname).toBe('http://ex.org/sparql');
        expect(url.query.query).toBe(countQuery);
      });
    }
    else {
      it('should use the cached COUNT result', () => {
        expect(request.calledOnce).toBe(true);
      });
    }

    it('should emit all triples in the SPARQL response', () => new Promise((done) => {
      streamLength(result).then((length) => { expect(length).toBe(55); done(); });
    }));

    it('should emit the extracted count', () => {
      expect(totalCount).toBe(12345678);
    });
  });
}
