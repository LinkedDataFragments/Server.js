var Datasource = require('../../lib/datasources/Datasource');

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

    it('should throw an error when trying to execute an unsupported query', function (done) {
      datasource.select({ features: { a: true, b: true } }, function (error) {
        error.should.be.an.instanceOf(Error);
        error.should.have.property('message', 'The datasource does not support the given query');
        done();
      });
    });

    it('should throw an error when trying to execute a supported query', function () {
      (function () { datasource.select({ features: {} }); })
      .should.throw('_executeQuery has not been implemented');
    });

    describe('when closed without a callback', function () {
      it('should do nothing', function () {
        datasource.close();
      });
    });

    describe('when closed with a callback', function () {
      it('should invoke the callback', function (done) {
        datasource.close(done);
      });
    });
  });

  describe('A derived Datasource instance', function () {
    var datasource = new Datasource();
    Object.defineProperty(datasource, 'supportedFeatures', {
      enumerable: true,
      value: { a: true, b: true, c: false },
    });
    datasource._executeQuery = sinon.stub();

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

    it('should not attach an error listener on select if none was passed', function () {
      var result = datasource.select({ features: {} });
      (function () { result.emit('error', new Error()); }).should.throw();
    });

    it('should attach an error listener on select if one was passed', function () {
      var onError = sinon.stub(), error = new Error();
      var result = datasource.select({ features: {} }, onError);
      result.emit('error', error);
      onError.should.have.been.calledOnce;
      onError.should.have.been.calledWith(error);
    });
  });
});
