var Datasource = require('../../lib/datasource/Datasource');

describe('Datasource', function () {
  describe('The Datasource module', function () {
    it('should be a function', function () {
      Datasource.should.be.a('function');
    });

    it('should be a Datasource constructor', function () {
      new Datasource().should.be.an.instanceof(Datasource);
    });

    it('should create new Datasource objects', function () {
      Datasource().should.be.an.instanceof(Datasource);
    });
  });

  describe('A Datasource instance', function () {
    var datasource = new Datasource();

    it('should not indicate support for any features', function () {
      datasource.supportedFeatures.should.deep.equal({});
    });

    it('should not support the empty query', function () {
      datasource.supportsQuery({}).should.be.false;
    });

    it('should not support a query with features', function () {
      datasource.supportsQuery({ features: { a: true, b: true } }).should.be.false;
    });

    it('should throw an error when trying to execute a query', function () {
      (function () { datasource.select({ features: { a: true, b: true } }); })
      .should.throw('The datasource does not support the given query');
    });
  });

  describe('A derived Datasource instance', function () {
    var datasource = new Datasource();
    Object.defineProperty(datasource, 'supportedFeatures', {
      enumerable: true,
      value: { a: true, b: true, c: false },
    });

    it('should support the empty query', function () {
      datasource.supportsQuery({}).should.be.true;
    });

    it('should support queries with supported features', function () {
      datasource.supportsQuery({ features: {} }).should.be.true;
      datasource.supportsQuery({ features: { a: true } }).should.be.true;
      datasource.supportsQuery({ features: { a: true, b: true } }).should.be.true;
      datasource.supportsQuery({ features: { b: true } }).should.be.true;
      datasource.supportsQuery({ features: { a: false, b: true } }).should.be.true;
      datasource.supportsQuery({ features: { a: true, b: false } }).should.be.true;
      datasource.supportsQuery({ features: { a: true, b: true, c: false } }).should.be.true;
    });

    it('should not support queries with unsupported features', function () {
      datasource.supportsQuery({ features: { c: true} }).should.be.false;
      datasource.supportsQuery({ features: { a: true, c: true} }).should.be.false;
      datasource.supportsQuery({ features: { b: true, c: true} }).should.be.false;
      datasource.supportsQuery({ features: { a: true, b: true, c: true} }).should.be.false;
    });

    it('should throw an error when _createTripleStream is not implemented', function () {
      (function () { datasource.select({ features: { a: true, b: true } }); })
      .should.throw('_createTripleStream has not been implemented');
    });
  });
});
