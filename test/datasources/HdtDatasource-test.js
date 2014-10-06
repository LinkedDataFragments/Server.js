var Datasource = require('../../lib/datasources/Datasource'),
    HdtDatasource = require('../../lib/datasources/HdtDatasource'),
    path = require('path');

var exampleHdtFile = path.join(__dirname, '../../node_modules/hdt/test/test.hdt');

describe('HdtDatasource', function () {
  describe('The HdtDatasource module', function () {
    it('should be a function', function () {
      HdtDatasource.should.be.a('function');
    });

    it('should be a HdtDatasource constructor', function (done) {
      var instance = new HdtDatasource({ file: exampleHdtFile });
      instance.should.be.an.instanceof(HdtDatasource);
      instance.close(done);
    });

    it('should create HdtDatasource objects', function (done) {
      var instance = HdtDatasource({ file: exampleHdtFile });
      instance.should.be.an.instanceof(HdtDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', function (done) {
      var instance = new HdtDatasource({ file: exampleHdtFile });
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  describe('A HdtDatasource instance for an example HDT file', function () {
    var datasource = new HdtDatasource({ file: exampleHdtFile });
    after(function (done) { datasource.close(done); });

    itShouldExecute(datasource,
      'the empty query',
      { features: { triplePattern: true } },
      132, 132);

    itShouldExecute(datasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, 132);

    itShouldExecute(datasource,
      'the empty query with an offset',
      { offset: 10, features: { triplePattern: true, offset: true } },
      122, 132);

    itShouldExecute(datasource,
      'a query for an existing subject',
      { subject: 'http://example.org/s1',   limit: 10, features: { triplePattern: true, limit: true } },
      10, 100);

    itShouldExecute(datasource,
      'a query for a non-existing subject',
      { subject: 'http://example.org/p1',   limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing predicate',
      { predicate: 'http://example.org/p1', limit: 10, features: { triplePattern: true, limit: true } },
      10, 100);

    itShouldExecute(datasource,
      'a query for a non-existing predicate',
      { predicate: 'http://example.org/s1', limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing object',
      { object: 'http://example.org/o001',  limit: 10, features: { triplePattern: true, limit: true } },
      3, 100);

    itShouldExecute(datasource,
      'a query for a non-existing object',
      { object: 'http://example.org/s1',    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);
  });
});

function itShouldExecute(datasource, name, query, expectedResultsCount, totalCount) {
  describe('executing ' + name, function () {
    var resultsCount = 0, totalCount;
    before(function (done) {
      var result = datasource.select(query);
      result.on('metadata', function (metadata) { totalCount = metadata.totalCount; });
      result.on('data', function () { resultsCount++; });
      result.on('end', done);
    });

    it('should return the expected number of triples', function () {
      expect(resultsCount).to.equal(expectedResultsCount);
    });

    it('should emit the expected total number of triples', function () {
      expect(totalCount).to.equal(totalCount);
    });
  });
}
