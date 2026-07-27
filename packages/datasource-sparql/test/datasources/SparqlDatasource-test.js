/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
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
      SparqlDatasource.should.be.a('function');
    });

    it('should be a SparqlDatasource constructor', () => {
      new SparqlDatasource({ dataFactory }).should.be.an.instanceof(SparqlDatasource);
    });

    it('should create Datasource objects', () => {
      new SparqlDatasource({ dataFactory }).should.be.an.instanceof(Datasource);
    });
  });

  describe('A SparqlDatasource instance', () => {
    let request = sinon.stub();
    let datasource = new SparqlDatasource({ dataFactory, endpoint: 'http://ex.org/sparql', request: request });
    datasource.initialize();

    it('should indicate support for its features', () => {
      datasource.supportedFeatures.should.deep.equal({
        triplePattern: true,
        quadPattern: true,
        limit: true,
        offset: true,
        totalCount: true,
      });
    });

    it('should support the empty query', () => {
      datasource.supportsQuery({}).should.be.true;
    });

    it('should support a query with supported features', () => {
      datasource.supportsQuery({ features: { limit: true, offset: true, b: false } }).should.be.true;
    });

    it('should not support a query with unsupported features', () => {
      datasource.supportsQuery({ features: { limit: true, b: true } }).should.be.false;
    });

    it('should throw an error when trying to execute an unsupported query', (done) => {
      datasource.select({ features: { a: true, b: true } }, (error) => {
        error.should.be.an.instanceOf(Error);
        error.should.have.property('message', 'The datasource does not support the given query');
        done();
      });
    });

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
      before((done) => {
        request.reset();
        request.onFirstCall().returns(test.createHttpResponse('invalid', 'application/sparql-results+json'));
        request.onSecondCall().returns(test.createHttpResponse(countResult, 'text/csv'));
        let query = { subject: dataFactory.namedNode('abcd'), features: { quadPattern: true } };
        result = datasource.select(query);
        result.on('error', (e) => { error = e; done(); });
      });

      it('should emit an error', () => {
        error.should.have.property('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: The endpoint returned an invalid SPARQL results JSON response.');
      });
    });

    describe('when invalid JSON is returned in response to the count query', () => {
      let result, error;
      before((done) => {
        request.reset();
        request.onFirstCall().returns(test.createHttpResponse(jsonResult, 'application/sparql-results+json'));
        request.onSecondCall().returns(test.createHttpResponse('invalid', 'application/trig'));
        let query = { subject: dataFactory.namedNode('abcde'), features: { quadPattern: true } };
        result = datasource.select(query);
        result.on('error', (e) => { error = e; done(); });
      });

      it('should emit an error', () => {
        error.should.have.property('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: COUNT query failed.');
      });
    });

    describe('when the data query request errors', () => {
      let result, error;
      before((done) => {
        request.reset();
        let query = { subject: dataFactory.namedNode('abcde'), features: { quadPattern: true } };
        result = datasource.select(query);
        result.on('error', (e) => { error = e; done(); });
        request.getCall(0).callArgWith(1, Error('query response error'));
      });

      it('should emit an error', () => {
        error.should.have.property('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: query response error');
      });
    });

    describe('when the count query request errors', () => {
      let result, totalCount;
      before(() => {
        request.reset();
        let query = { subject: dataFactory.namedNode('abcdef'), features: { quadPattern: true } };
        result = datasource.select(query);
        request.returnValues[1].emit('error', new Error());
        result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      });

      it('should emit a high count estimate', () => {
        expect(totalCount).to.equal(1e9);
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
});

function itShouldExecute(datasource, request, name, query, constructQuery, countQuery) {
  describe('executing ' + name, () => {
    let result, totalCount;
    before(() => {
      request.reset();
      request.onFirstCall().returns(test.createHttpResponse(jsonResult, 'application/sparql-results+json'));
      request.onSecondCall().returns(test.createHttpResponse(countResult, 'text/csv'));
      result = datasource.select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
    });

    it('should request a matching CONSTRUCT query', () => {
      request.should.have.been.called;
      let url = URL.parse(request.firstCall.args[0].url, true);
      (url.protocol + '//' + url.host + url.pathname).should.equal('http://ex.org/sparql');
      url.query.query.should.equal(constructQuery);
    });

    if (countQuery) {
      it('should request a matching COUNT query', () => {
        request.should.have.been.calledTwice;
        let url = URL.parse(request.secondCall.args[0].url, true);
        (url.protocol + '//' + url.host + url.pathname).should.equal('http://ex.org/sparql');
        url.query.query.should.equal(countQuery);
      });
    }
    else {
      it('should use the cached COUNT result', () => {
        request.should.have.been.calledOnce;
      });
    }

    it('should emit all triples in the SPARQL response', (done) => {
      result.should.be.a.streamWithLength(55, done);
    });

    it('should emit the extracted count', () => {
      expect(totalCount).to.equal(12345678);
    });
  });
}
