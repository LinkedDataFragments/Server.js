/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
var SparqlDatasource = require('../../lib/datasources/SparqlDatasource');

var Datasource = require('../../lib/datasources/Datasource'),
    fs = require('fs'),
    path = require('path'),
    URL = require('url');

var trigResult = fs.readFileSync(path.join(__dirname, '../assets/sparql-quads-response.trig'));
var countResult = '"c"\n12345678\n';

describe('SparqlDatasource', function () {
  describe('The SparqlDatasource module', function () {
    it('should be a function', function () {
      SparqlDatasource.should.be.a('function');
    });

    it('should be a SparqlDatasource constructor', function () {
      new SparqlDatasource().should.be.an.instanceof(SparqlDatasource);
    });

    it('should create SparqlDatasource objects', function () {
      SparqlDatasource().should.be.an.instanceof(SparqlDatasource);
    });

    it('should create Datasource objects', function () {
      new SparqlDatasource().should.be.an.instanceof(Datasource);
      SparqlDatasource().should.be.an.instanceof(Datasource);
    });
  });

  describe('A SparqlDatasource instance', function () {
    var request = sinon.stub();
    var datasource = new SparqlDatasource({ endpoint: 'http://ex.org/sparql', request: request });

    it('should indicate support for its features', function () {
      datasource.supportedFeatures.should.deep.equal({
        quadPattern: true,
        limit: true,
        offset: true,
        totalCount: true,
      });
    });

    it('should support the empty query', function () {
      datasource.supportsQuery({}).should.be.true;
    });

    it('should support a query with supported features', function () {
      datasource.supportsQuery({ features: { limit: true, offset: true, b: false } }).should.be.true;
    });

    it('should not support a query with unsupported features', function () {
      datasource.supportsQuery({ features: { limit: true, b: true } }).should.be.false;
    });

    it('should throw an error when trying to execute an unsupported query', function (done) {
      datasource.select({ features: { a: true, b: true } }, function (error) {
        error.should.be.an.instanceOf(Error);
        error.should.have.property('message', 'The datasource does not support the given query');
        done();
      });
    });

    itShouldExecute(datasource, request,
      'the empty query',
      { features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{?s ?p ?o}} WHERE {GRAPH ?g{?s ?p ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p ?o}}');

    itShouldExecute(datasource, request,
      'an empty query with a limit',
      { limit: 100, features: { limit: true } },
      'CONSTRUCT {GRAPH ?g{?s ?p ?o}} WHERE {GRAPH ?g{?s ?p ?o}} LIMIT 100',
      null /* count should be cached, since this pattern already occurred above */);

    itShouldExecute(datasource, request,
      'an empty query with a limit and an offset',
      { limit: 100, offset: 200, features: { limit: true, offset: true } },
      'CONSTRUCT {GRAPH ?g{?s ?p ?o}} WHERE {GRAPH ?g{?s ?p ?o}} LIMIT 100 OFFSET 200',
      null /* count should be cached, since this pattern already occurred above */);

    itShouldExecute(datasource, request,
      'a query for a subject IRI',
      { subject: 'http://example.org/bar#foo', features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{<http://example.org/bar#foo> ?p ?o}} WHERE {GRAPH ?g{<http://example.org/bar#foo> ?p ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{<http://example.org/bar#foo> ?p ?o}}');

    itShouldExecute(datasource, request,
      'a query for a predicate IRI',
      { predicate: 'http://example.org/bar#foo', features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{?s <http://example.org/bar#foo> ?o}} WHERE {GRAPH ?g{?s <http://example.org/bar#foo> ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s <http://example.org/bar#foo> ?o}}');

    itShouldExecute(datasource, request,
      'a query for an object IRI',
      { object: 'http://example.org/bar#foo', features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{?s ?p <http://example.org/bar#foo>}} WHERE {GRAPH ?g{?s ?p <http://example.org/bar#foo>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p <http://example.org/bar#foo>}}');

    itShouldExecute(datasource, request,
      'a query for an object literal',
      { object: '"a literal"', features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{?s ?p "a literal"}} WHERE {GRAPH ?g{?s ?p "a literal"}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with newlines and quotes',
      { object: '"a\rb\nc"\r\n\\""', features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{?s ?p """a\rb\nc\\"\r\n\\\\\\""""}} WHERE {GRAPH ?g{?s ?p """a\rb\nc\\"\r\n\\\\\\""""}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p """a\rb\nc\\"\r\n\\\\\\""""}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with a language',
      { object: '"a literal"@nl-be', features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{?s ?p "a literal"@nl-be}} WHERE {GRAPH ?g{?s ?p "a literal"@nl-be}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"@nl-be}}');

    itShouldExecute(datasource, request,
      'a query for an object literal with a type',
      { object: '"a literal"^^http://ex.org/foo#literal', features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{?s ?p "a literal"^^<http://ex.org/foo#literal>}} ' +
          'WHERE {GRAPH ?g{?s ?p "a literal"^^<http://ex.org/foo#literal>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s ?p "a literal"^^<http://ex.org/foo#literal>}}');

    itShouldExecute(datasource, request,
      'a query for a predicate and object URI',
      { predicate: 'http://example.org/bar#foo',
        object: 'http://example.org/baz#bar',
        features: { quadPattern: true } },
      'CONSTRUCT {GRAPH ?g{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}} ' +
          'WHERE {GRAPH ?g{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}}');

    itShouldExecute(datasource, request,
      'a query for a predicate and object URI with offset and limit',
      { predicate: 'http://example.org/bar#foo',
        object: 'http://example.org/baz#bar',
        limit: 50, offset: 150,
        features: { quadPattern: true, offset: true, limit: true } },
      'CONSTRUCT {GRAPH ?g{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}} ' +
          'WHERE {GRAPH ?g{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}} ' +
          'LIMIT 50 OFFSET 150',
      null /* count should be cached, since this pattern already occurred above */);

    itShouldExecute(datasource, request,
      'a query for a graph IRI',
      { graph: 'http://dbpedia.org', features: { quadPattern: true } },
      'CONSTRUCT {GRAPH <http://dbpedia.org>{?s ?p ?o}} WHERE {GRAPH <http://dbpedia.org>{?s ?p ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH <http://dbpedia.org>{?s ?p ?o}}');

    itShouldExecute(datasource, request,
      'a query for a predicate and graph IRI',
      { predicate: 'http://example.org/bar#foo',
        graph: 'http://dbpedia.org',
        features: { quadPattern: true } },
      'CONSTRUCT {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> ?o}} ' +
        'WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> ?o}}',
      'SELECT (COUNT(*) AS ?c) WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> ?o}}');

    itShouldExecute(datasource, request,
      'a query for a predicate, object and graph URI',
      { predicate: 'http://example.org/bar#foo',
        object: 'http://example.org/baz#bar',
        graph: 'http://dbpedia.org',
        features: { quadPattern: true } },
      'CONSTRUCT {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}} ' +
      'WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}}',
      'SELECT (COUNT(*) AS ?c) ' +
        'WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}}');

    itShouldExecute(datasource, request,
      'a query for a predicate, object and graph URI with offset and limit',
      { predicate: 'http://example.org/bar#foo',
        object: 'http://example.org/baz#bar',
        graph: 'http://dbpedia.org',
        limit: 50, offset: 150,
        features: { quadPattern: true, offset: true, limit: true } },
      'CONSTRUCT {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}} ' +
      'WHERE {GRAPH <http://dbpedia.org>{?s <http://example.org/bar#foo> <http://example.org/baz#bar>}} ' +
      'LIMIT 50 OFFSET 150',
      null /* count should be cached, since this pattern already occurred above */);

    describe('when the first Trig request fails', function () {
      var result, totalCount, firstArgsCopy;
      before(function () {
        request.reset();
        request.onFirstCall().returns(test.createHttpResponse('invalid Trig', 'application/trig'));
        request.onSecondCall().returns(test.createHttpResponse(countResult, 'text/csv'));
        request.onThirdCall().returns(test.createHttpResponse(trigResult, 'application/trig'));

        result = datasource.select({ subject: 'abc', features: { quadPattern: true } });
        result.getProperty('metadata', function (metadata) { totalCount = metadata.totalCount; });
        firstArgsCopy = JSON.parse(JSON.stringify(request.firstCall.args[0]));
      });

      it('should request a matching CONSTRUCT query the first time', function () {
        request.should.have.been.called;
        var url = URL.parse(firstArgsCopy.url, true);
        (url.protocol + '//' + url.host + url.pathname).should.equal('http://ex.org/sparql');
        url.query.query.should.equal('CONSTRUCT {GRAPH ?g{<abc> ?p ?o}} WHERE {GRAPH ?g{<abc> ?p ?o}}');
      });

      it('should ask for Turtle the first time', function () {
        request.should.have.been.called;
        firstArgsCopy.headers.should.deep.equal(
          { accept: 'application/x-trig;q=1.0,application/trig;q=0.95,' +
                    'text/turtle;q=0.9,application/n-triples;q=0.5,text/n3;q=0.3' });
      });

      it('should request a matching COUNT query', function () {
        request.should.have.been.calledThrice;
        var url = URL.parse(request.secondCall.args[0].url, true);
        (url.protocol + '//' + url.host + url.pathname).should.equal('http://ex.org/sparql');
        url.query.query.should.equal('SELECT (COUNT(*) AS ?c) WHERE {GRAPH ?g{<abc> ?p ?o}}');
      });

      it('should request a matching CONSTRUCT query the second time', function () {
        request.should.have.been.calledThrice;
        var url = URL.parse(request.thirdCall.args[0].url, true);
        (url.protocol + '//' + url.host + url.pathname).should.equal('http://ex.org/sparql');
        url.query.query.should.equal('CONSTRUCT {GRAPH ?g{<abc> ?p ?o}} WHERE {GRAPH ?g{<abc> ?p ?o}}');
      });

      it('should ask for N-Triples the second time', function () {
        request.should.have.been.calledThrice;
        request.thirdCall.args[0].headers.should.deep.equal({ accept: 'application/n-triples' });
      });

      it('should emit all triples in the SPARQL response', function (done) {
        result.should.be.a.streamWithLength(55, done);
      });

      it('should emit the extracted count', function () {
        expect(totalCount).to.equal(12345678);
      });
    });

    describe('when invalid Trig is returned in response to the data query', function () {
      var result, error;
      before(function (done) {
        request.reset();
        request.onFirstCall().returns(test.createHttpResponse('invalid', 'application/trig'));
        request.onSecondCall().returns(test.createHttpResponse(countResult, 'text/csv'));
        request.onThirdCall().returns(test.createHttpResponse('invalid', 'application/trig'));

        result = datasource.select({ subject: 'abcd', features: { quadPattern: true } });
        result.on('error', function (e) { error = e; done(); });
      });

      it('should emit an error', function () {
        error.should.have.property('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: The endpoint returned an invalid Turtle response.');
      });
    });

    describe('when invalid Turtle is returned in response to the count query', function () {
      var result, error;
      before(function (done) {
        request.reset();
        request.onFirstCall().returns(test.createHttpResponse(trigResult, 'application/trig'));
        request.onSecondCall().returns(test.createHttpResponse('invalid', 'application/trig'));

        result = datasource.select({ subject: 'abcde', features: { quadPattern: true } });
        result.on('error', function (e) { error = e; done(); });
      });

      it('should emit an error', function () {
        error.should.have.property('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: COUNT query failed.');
      });
    });

    describe('when the data query request errors', function () {
      var result, error;
      before(function (done) {
        request.reset();

        result = datasource.select({ subject: 'abcde', features: { quadPattern: true } });
        result.on('error', function (e) { error = e; done(); });
        request.getCall(0).callArgWith(1, Error('query response error'));
      });

      it('should emit an error', function () {
        error.should.have.property('message', 'Error accessing SPARQL endpoint http://ex.org/sparql: query response error');
      });
    });

    describe('when the count query request errors', function () {
      var result, totalCount;
      before(function () {
        request.reset();

        result = datasource.select({ subject: 'abcdef', features: { quadPattern: true } });
        request.returnValues[1].emit('error', new Error());
        result.getProperty('metadata', function (metadata) { totalCount = metadata.totalCount; });
      });

      it('should emit a high count estimate', function () {
        expect(totalCount).to.equal(1e9);
      });
    });
  });
});

function itShouldExecute(datasource, request, name, query, constructQuery, countQuery) {
  describe('executing ' + name, function () {
    var result, totalCount;
    before(function () {
      request.reset();
      request.onFirstCall().returns(test.createHttpResponse(trigResult, 'application/trig'));
      request.onSecondCall().returns(test.createHttpResponse(countResult, 'text/csv'));

      result = datasource.select(query);
      result.getProperty('metadata', function (metadata) { totalCount = metadata.totalCount; });
    });

    it('should request a matching CONSTRUCT query', function () {
      request.should.have.been.called;
      var url = URL.parse(request.firstCall.args[0].url, true);
      (url.protocol + '//' + url.host + url.pathname).should.equal('http://ex.org/sparql');
      url.query.query.should.equal(constructQuery);
    });

    if (countQuery) {
      it('should request a matching COUNT query', function () {
        request.should.have.been.calledTwice;
        var url = URL.parse(request.secondCall.args[0].url, true);
        (url.protocol + '//' + url.host + url.pathname).should.equal('http://ex.org/sparql');
        url.query.query.should.equal(countQuery);
      });
    }
    else {
      it('should use the cached COUNT result', function () {
        request.should.have.been.calledOnce;
      });
    }

    it('should emit all triples in the SPARQL response', function (done) {
      result.should.be.a.streamWithLength(55, done);
    });

    it('should emit the extracted count', function () {
      expect(totalCount).to.equal(12345678);
    });
  });
}
