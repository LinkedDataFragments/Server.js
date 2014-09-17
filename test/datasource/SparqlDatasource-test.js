var Datasource = require('../../lib/datasource/Datasource'),
    SparqlDatasource = require('../../lib/datasource/SparqlDatasource');

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
    var datasource = new SparqlDatasource();

    it('should indicate support for its features', function () {
      datasource.supportedFeatures.should.deep.equal({
        triplePattern: true,
        limit: true,
        offset: true,
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

    it('should throw an error when trying to execute an unsupported query', function () {
      (function () { datasource.select({ features: { a: true, b: true } }); })
      .should.throw('The datasource does not support the given query.');
    });
  });
});
