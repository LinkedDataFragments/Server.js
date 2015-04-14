var Datasource = require('../../lib/datasources/Datasource'),
    ElasticSearchDatasource = require('../../lib/datasources/ElasticSearchDatasource'),
    path = require('path');

describe('ElasticSearchDatasource', function () {
  describe('The ElasticSearchDatasource module', function () {
    it('should be a function', function () {
      ElasticSearchDatasource.should.be.a('function');
    });

    it('should be an ElasticSearchDatasource constructor', function () {
      var instance = new ElasticSearchDatasource();
      instance.should.be.an.instanceof(ElasticSearchDatasource);
    });

    it('should create ElasticSearchDatasource objects', function (done) {
      var instance = ElasticSearchDatasource();
      instance.should.be.an.instanceof(ElasticSearchDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', function (done) {
      var instance = new ElasticSearchDatasource();
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  describe('An ElasticSearchDatasource instance', function () {
    var jsonResponse;
    var request = sinon.stub();
    var datasource = new ElasticSearchDatasource({
      endpoint: 'http://elastic.example.org/',
      request: request,
    });
    after(function (done) { datasource.close(done); });

    itShouldExecute(datasource,
      'a query for a substring',
      { features: { substring: true }, substring: 'abc' },
      // expected POST body
      {
        from: 0, size: null,
        query: { match: { lookup: { query: 'abc' } } },
      },
      // server response
      request, { hits: { total: 1234, hits: [
        { _source: { literal: '\"abc\"' } },
        { _source: { literal: '\"abc\"@en' } },
        { _source: { literal: '\"abc\"^^bcd' } },
      ] } },
      // expected number of results, total results, and resulting triples
      3, 1234,
      [
        { subject: '_:l1', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"' },
        { subject: '_:l2', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"@en' },
        { subject: '_:l3', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"^^bcd' },
      ]);

    itShouldExecute(datasource,
      'a query for a substring with a limit',
      { features: { substring: true, limit: true }, substring: 'abc', limit: 30 },
      // expected POST body
      {
        from: 0, size: 30,
        query: { match: { lookup: { query: 'abc' } } },
      },
      // server response
      request, { hits: { total: 1234, hits: [
        { _source: { literal: '\"abc\"' } },
        { _source: { literal: '\"abc\"@en' } },
        { _source: { literal: '\"abc\"^^bcd' } },
      ] } },
      // expected number of results, total results, and resulting triples
      3, 1234,
      [
        { subject: '_:l1', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"' },
        { subject: '_:l2', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"@en' },
        { subject: '_:l3', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"^^bcd' },
      ]);

    itShouldExecute(datasource,
      'a query for a substring with an offset',
      { features: { substring: true, offset: true }, substring: 'abc', offset: 20 },
      // expected POST body
      {
        from: 20, size: null,
        query: { match: { lookup: { query: 'abc' } } },
      },
      // server response
      request, { hits: { total: 1234, hits: [
        { _source: { literal: '\"abc\"' } },
        { _source: { literal: '\"abc\"@en' } },
        { _source: { literal: '\"abc\"^^bcd' } },
      ] } },
      // expected number of results, total results, and resulting triples
      3, 1234,
      [
        { subject: '_:l21', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"' },
        { subject: '_:l22', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"@en' },
        { subject: '_:l23', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"^^bcd' },
      ]);

    itShouldExecute(datasource,
      'a query for a substring with a limit and an offset',
      { features: { substring: true, limit: true, offset: true }, substring: 'abc', limit: 10, offset: 40 },
      // expected POST body
      {
        from: 40, size: 10,
        query: { match: { lookup: { query: 'abc' } } },
      },
      // server response
      request, { hits: { total: 1234, hits: [
        { _source: { literal: '\"abc\"' } },
        { _source: { literal: '\"abc\"@en' } },
        { _source: { literal: '\"abc\"^^bcd' } },
      ] } },
      // expected number of results, total results, and resulting triples
      3, 1234,
      [
        { subject: '_:l41', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"' },
        { subject: '_:l42', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"@en' },
        { subject: '_:l43', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"^^bcd' },
      ]);
  });
});

function itShouldExecute(datasource, name, query, body, request, response,
                         expectedResultsCount, expectedTotalCount, expectedTriples) {
  describe('executing ' + name, function () {
    var resultsCount = 0, totalCount, triples = [];
    before(function (done) {
      request.reset();
      request.callsArgWith(1, null, null, JSON.stringify(response)); // emulate HTTP request
      var result = datasource.select(query);
      result.on('metadata', function (metadata) { totalCount = metadata.totalCount; });
      result.on('data', function (triple) { resultsCount++; expectedTriples && triples.push(triple); });
      result.on('end', done);
    });

    it('should send the correct request', function () {
      request.should.have.been.calledOnce;
      request.getCall(0).args[0].should.deep.equal({
        url: 'http://elastic.example.org/_search',
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
    });

    it('should return the expected number of triples', function () {
      expect(resultsCount).to.equal(expectedResultsCount);
    });

    it('should emit the expected total number of triples', function () {
      expect(totalCount).to.equal(expectedTotalCount);
    });

    if (expectedTriples) {
      it('should emit the expected triples', function () {
        expect(triples.length).to.equal(expectedTriples.length);
        for (var i = 0; i < expectedTriples.length; i++)
          triples[i].should.deep.equal(expectedTriples[i]);
      });
    }
  });
}
