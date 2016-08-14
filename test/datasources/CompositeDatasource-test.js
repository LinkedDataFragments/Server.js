/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var CompositeDatasource = require('../../lib/datasources/CompositeDatasource');

var Datasource = require('../../lib/datasources/Datasource'),
    HdtDatasource = require('../../lib/datasources/HdtDatasource'),
    TurtleDatasource = require('../../lib/datasources/TurtleDatasource'),
    path = require('path');

var exampleHdtFile = path.join(__dirname, '../assets/test.hdt');
var exampleHdtFileWithBlanks = path.join(__dirname, '../assets/test-blank.hdt');
var exampleTurtleUrl = 'file://' + path.join(__dirname, '../assets/test.ttl');

describe('CompositeDatasource', function () {
  var datasources = {
    data0: { datasource: new HdtDatasource({ file: exampleHdtFile }), size: 132 },
    data1: { datasource: new HdtDatasource({ file: exampleHdtFileWithBlanks }), size: 6 },
    data2: { datasource: new TurtleDatasource({ url: exampleTurtleUrl }), size: 132 },
  };
  var references = Object.keys(datasources);
  var totalSize = Object.keys(datasources).reduce(function (acc, key) {
    return acc + datasources[key].size;
  }, 0);

  describe('The CompositeDatasource module', function () {
    it('should be a function', function () {
      CompositeDatasource.should.be.a('function');
    });

    it('should be an CompositeDatasource constructor', function (done) {
      var instance = new CompositeDatasource({ datasources: datasources, references: references });
      instance.should.be.an.instanceof(CompositeDatasource);
      instance.close(done);
    });

    it('should create CompositeDatasource objects', function (done) {
      var instance = new CompositeDatasource({ datasources: datasources, references: references });
      instance.should.be.an.instanceof(CompositeDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', function (done) {
      var instance = new CompositeDatasource({ datasources: datasources, references: references });
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  describe('A CompositeDatasource instance for two HdtDatasources', function () {
    var datasource;
    function getDatasource() { return datasource; }
    before(function (done) {
      datasource = new CompositeDatasource({ datasources: datasources, references: references });
      datasource.on('initialized', done);
    });
    after(function (done) {
      datasource.close(done);
    });

    itShouldExecute(getDatasource,
      'the empty query',
      { features: { triplePattern: true } },
      totalSize, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 10',
      { offset: 10, features: { triplePattern: true, offset: true } },
      totalSize - 10, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 100',
      { offset: 100, features: { triplePattern: true, offset: true } },
      totalSize - 100, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 200',
      { offset: 200, features: { triplePattern: true, offset: true } },
      totalSize - 200, totalSize);

    itShouldExecute(getDatasource,
      'a query for an existing subject',
      { subject: 'http://example.org/s1',   limit: 10, features: { triplePattern: true, limit: true } },
      10, 200);

    itShouldExecute(getDatasource,
      'a query for a non-existing subject',
      { subject: 'http://example.org/p1',   limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing predicate',
      { predicate: 'http://example.org/p1', limit: 10, features: { triplePattern: true, limit: true } },
      10, 220);

    itShouldExecute(getDatasource,
      'a query for a non-existing predicate',
      { predicate: 'http://example.org/s1', limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing object',
      { object: 'http://example.org/o001',  limit: 10, features: { triplePattern: true, limit: true } },
      6, 6);

    itShouldExecute(getDatasource,
      'a query for a non-existing object',
      { object: 'http://example.org/s1',    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);
  });
});

function itShouldExecute(getDatasource, name, query,
                         expectedResultsCount, expectedTotalCount, expectedTriples) {
  describe('executing ' + name, function () {
    var resultsCount = 0, totalCount, triples = [];
    before(function (done) {
      var result = getDatasource().select(query);
      result.on('metadata', function (metadata) { totalCount = metadata.totalCount; });
      result.on('data', function (triple) { resultsCount++; expectedTriples && triples.push(triple); });
      result.on('end', done);
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
