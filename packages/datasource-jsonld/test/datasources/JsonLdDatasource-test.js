/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
let JsonLdDatasource = require('../../').datasources.JsonLdDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    path = require('path'),
    dataFactory = require('n3').DataFactory;

let exampleJsonLdUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.jsonld');

describe('JsonLdDatasource', () => {
  describe('The JsonLdDatasource module', () => {
    it('should be a function', () => {
      JsonLdDatasource.should.be.a('function');
    });

    it('should be a JsonLdDatasource constructor', (done) => {
      let instance = new JsonLdDatasource({ dataFactory, url: exampleJsonLdUrl });
      instance.should.be.an.instanceof(JsonLdDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', (done) => {
      let instance = new JsonLdDatasource({ dataFactory, url: exampleJsonLdUrl });
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  describe('A JsonLdDatasource instance for an example JsonLd file', () => {
    let datasource = new JsonLdDatasource({ dataFactory, url: exampleJsonLdUrl });
    datasource.initialize();
    after((done) => { datasource.close(done); });

    itShouldExecute(datasource,
      'the empty query',
      { features: { triplePattern: true } },
      129, 129);

    itShouldExecute(datasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, 129);

    itShouldExecute(datasource,
      'the empty query with an offset',
      { offset: 10, features: { triplePattern: true, offset: true } },
      119, 129);

    itShouldExecute(datasource,
      'a query for an existing subject',
      { subject: dataFactory.namedNode('http://example.org/s1'),   limit: 10, features: { triplePattern: true, limit: true } },
      10, 100);

    itShouldExecute(datasource,
      'a query for a non-existing subject',
      { subject: dataFactory.namedNode('http://example.org/p1'),   limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/p1'), limit: 10, features: { triplePattern: true, limit: true } },
      10, 110);

    itShouldExecute(datasource,
      'a query for a non-existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/s1'), limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing object',
      { object: dataFactory.namedNode('http://example.org/o001'),  limit: 10, features: { triplePattern: true, limit: true } },
      3, 3);

    itShouldExecute(datasource,
      'a query for a non-existing object',
      { object: dataFactory.namedNode('http://example.org/s1'),    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing graph',
      { graph: dataFactory.namedNode('http://example.org/g'),      limit: 10, features: { quadPattern: true, limit: true } },
      10, 10);

    itShouldExecute(datasource,
      'a query for a non-existing graph',
      { graph: dataFactory.namedNode('http://example.org/s1'),     limit: 10, features: { quadPattern: true, limit: true } },
      0, 0);
  });
});

function itShouldExecute(datasource, name, query, expectedResultsCount, expectedTotalCount) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount;
    before((done) => {
      let result = datasource.select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', (triple) => { resultsCount++; });
      result.on('end', done);
    });

    it('should return the expected number of triples', () => {
      expect(resultsCount).to.equal(expectedResultsCount);
    });

    it('should emit the expected total number of triples', () => {
      expect(totalCount).to.equal(expectedTotalCount);
    });
  });
}
