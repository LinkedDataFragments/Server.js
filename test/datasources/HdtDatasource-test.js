var Datasource = require('../../lib/datasources/Datasource'),
    HdtDatasource = require('../../lib/datasources/HdtDatasource'),
    path = require('path');

var exampleHdtFile = path.join(__dirname, '../assets/test.hdt');
var exampleHdtFileWithBlanks = path.join(__dirname, '../assets/test-blank.hdt');
var exampleHdtFileWithFmIndex = path.join(__dirname, '../assets/test-fm.hdt');

describe('HdtDatasource', function () {
  describe('The HdtDatasource module', function () {
    it('should be a function', function () {
      HdtDatasource.should.be.a('function');
    });

    it('should be an HdtDatasource constructor', function (done) {
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

  describe('An HdtDatasource instance for an example HDT file', function () {
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
      10, 20);

    itShouldExecute(datasource,
      'a query for a non-existing predicate',
      { predicate: 'http://example.org/s1', limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing object',
      { object: 'http://example.org/o001',  limit: 10, features: { triplePattern: true, limit: true } },
      3, 3);

    itShouldExecute(datasource,
      'a query for a non-existing object',
      { object: 'http://example.org/s1',    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);
  });

  describe('An HdtDatasource instance with blank nodes', function () {
    var datasource = new HdtDatasource({ file: exampleHdtFileWithBlanks });
    after(function (done) { datasource.close(done); });

    itShouldExecute(datasource,
      'the empty query',
      { features: { triplePattern: true } },
      6, 6,
      [
        { subject: 'genid:a', predicate: 'b', object: 'c1' },
        { subject: 'genid:a', predicate: 'b', object: 'c2' },
        { subject: 'genid:a', predicate: 'b', object: 'c3' },
        { subject: 'a',       predicate: 'b', object: 'genid:c1' },
        { subject: 'a',       predicate: 'b', object: 'genid:c2' },
        { subject: 'a',       predicate: 'b', object: 'genid:c3' },
      ]);

    itShouldExecute(datasource,
      'a query for a blank subject',
      { suject: '_:a', features: { triplePattern: true } },
      6, 6);

    itShouldExecute(datasource,
      'a query for a IRI that corresponds to a blank node as subject',
      { subject: 'genid:a', features: { triplePattern: true } },
      3, 3,
      [
        { subject: 'genid:a', predicate: 'b', object: 'c1' },
        { subject: 'genid:a', predicate: 'b', object: 'c2' },
        { subject: 'genid:a', predicate: 'b', object: 'c3' },
      ]);

    itShouldExecute(datasource,
      'a query for a IRI that corresponds to a blank node as object',
      { object: 'genid:c1', features: { triplePattern: true } },
      1, 1,
      [
        { subject: 'a', predicate: 'b', object: 'genid:c1' },
      ]);
  });

  describe('An HdtDatasource instance with blank nodes and a blank node prefix', function () {
    var datasource = new HdtDatasource({ file: exampleHdtFileWithBlanks,
                                         blankNodePrefix: 'http://example.org/.well-known/genid/' });
    after(function (done) { datasource.close(done); });

    itShouldExecute(datasource,
      'the empty query',
      { features: { triplePattern: true } },
      6, 6,
      [
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c1' },
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c2' },
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c3' },
        { subject: 'a', predicate: 'b', object: 'http://example.org/.well-known/genid/c1' },
        { subject: 'a', predicate: 'b', object: 'http://example.org/.well-known/genid/c2' },
        { subject: 'a', predicate: 'b', object: 'http://example.org/.well-known/genid/c3' },
      ]);

    itShouldExecute(datasource,
      'a query for a blank subject',
      { suject: '_:a', features: { triplePattern: true } },
      6, 6);

    itShouldExecute(datasource,
      'a query for a IRI that corresponds to a blank node as subject',
      { subject: 'http://example.org/.well-known/genid/a', features: { triplePattern: true } },
      3, 3,
      [
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c1' },
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c2' },
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c3' },
      ]);

    itShouldExecute(datasource,
      'a query for a IRI that corresponds to a blank node as object',
      { object: 'http://example.org/.well-known/genid/c1', features: { triplePattern: true } },
      1, 1,
      [
        { subject: 'a', predicate: 'b', object: 'http://example.org/.well-known/genid/c1' },
      ]);
  });

  describe('An HdtDatasource instance for an HDT file without FM index', function () {
    var datasource = new HdtDatasource({ file: exampleHdtFile });
    after(function (done) { datasource.close(done); });

    itShouldNotExecute(datasource,
      'a query for a substring',
      { features: { substring: true }, substring: 'abc' },
      'The HDT document does not support literal search');
  });

  describe('An HdtDatasource instance for an HDT file with FM index', function () {
    var datasource = new HdtDatasource({ file: exampleHdtFileWithFmIndex,
                                         blankNodePrefix: '_:' });
    after(function (done) { datasource.close(done); });

    itShouldExecute(datasource,
      'a query for a substring',
      { features: { substring: true }, substring: 'abc' },
      3, 3,
      [
        { subject: '_:l0', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"' },
        { subject: '_:l1', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"@en' },
        { subject: '_:l2', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value', object: '\"abc\"^^bcd' },
      ]);
  });
});

function itShouldExecute(datasource, name, query,
                         expectedResultsCount, expectedTotalCount, expectedTriples) {
  describe('executing ' + name, function () {
    var resultsCount = 0, totalCount, triples = [];
    before(function (done) {
      var result = datasource.select(query);
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

function itShouldNotExecute(datasource, name, query, expectedError) {
  describe('executing ' + name, function () {
    var error;
    before(function (done) {
      var result = datasource.select(query);
      result.once('error', function (e) { error = e; done(); });
    });

    it('should return the expected error', function () {
      expect(error).to.be.an.instanceof(Error);
      expect(error).to.have.property('message', expectedError);
    });
  });
}
