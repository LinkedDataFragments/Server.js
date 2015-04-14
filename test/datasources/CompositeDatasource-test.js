var Datasource = require('../../lib/datasources/Datasource'),
    CompositeDatasource = require('../../lib/datasources/CompositeDatasource'),
    path = require('path');

var exampleHdtFile = path.join(__dirname, '../assets/test.hdt');
var exampleHdtFileWithBlanks = path.join(__dirname, '../assets/test-blank.hdt');
var exampleHdtFileWithFmIndex = path.join(__dirname, '../assets/test-fm.hdt');

describe('CompositeDatasource', function () {
  describe('The CompositeDatasource module', function () {
    it('should be a function', function () {
      CompositeDatasource.should.be.a('function');
    });

    it('should be a CompositeDatasource constructor', function (done) {
      var instance = new CompositeDatasource();
      instance.should.be.an.instanceof(CompositeDatasource);
      instance.close(done);
    });

    it('should create CompositeDatasource objects', function (done) {
      var instance = CompositeDatasource();
      instance.should.be.an.instanceof(CompositeDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', function (done) {
      var instance = new CompositeDatasource();
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  describe('A CompositeDatasource instance without datasources', function () {
    var datasource = new CompositeDatasource();

    it('should not support the all query', function () {
      datasource.supportsQuery({}).should.be.false;
    });

    it('should not support a non-empty query', function () {
      datasource.supportsQuery({ a: 1 }).should.be.false;
    });

    it('should return an error when executing a query', function (done) {
      datasource.select({ a: 1 }, function (error) {
        expect(error).to.be.an.instanceof(Error);
        error.message.should.equal('The datasource does not support the given query');
        done();
      });
    });
  });

  describe('A CompositeDatasource instance with one datasource', function () {
    var datasources = [
      { supportsQuery: function (q) { return q.choice === 1; }, select: sinon.stub() },
    ];
    var datasource = new CompositeDatasource({ datasources: datasources });

    it('should not support a query that is not supported by the one datasource', function () {
      datasource.supportsQuery({ choice: 0 }).should.be.false;
    });

    it('should support a query that is supported by the one datasource', function () {
      datasource.supportsQuery({ choice: 1 }).should.be.true;
    });

    it('should execute a query on the one datasource if supported', function () {
      datasource.select({ choice: 1 });
      datasources[0].select.should.have.been.calledOnce;
      datasources[0].select.should.have.been.calledWith({ choice: 1 });
    });

    it('should return an error when executing an unsupported query', function (done) {
      datasource.select({ choice: 0 }, function (error) {
        expect(error).to.be.an.instanceof(Error);
        error.message.should.equal('The datasource does not support the given query');
        done();
      });
    });
  });

  describe('A CompositeDatasource instance with two datasources', function () {
    var datasources = [
      { supportsQuery: function (q) { return q.choice     === 1; }, select: sinon.stub() },
      { supportsQuery: function (q) { return q.choice % 2 === 1; }, select: sinon.stub() },
    ];
    var datasource = new CompositeDatasource({ datasources: datasources });

    it('should not support a query that is not supported by both datasources', function () {
      datasource.supportsQuery({ choice: 0 }).should.be.false;
    });

    it('should support a query that is supported by the first datasource', function () {
      datasource.supportsQuery({ choice: 1 }).should.be.true;
    });

    it('should support a query that is supported by the second datasource', function () {
      datasource.supportsQuery({ choice: 3 }).should.be.true;
    });

    it('should execute a query on the first datasource if supported', function () {
      datasource.select({ choice: 1 });
      datasources[0].select.should.have.been.calledOnce;
      datasources[0].select.should.have.been.calledWith({ choice: 1 });
    });

    it('should execute a query on the second datasource if not supported by the first', function () {
      datasource.select({ choice: 3 });
      datasources[1].select.should.have.been.calledOnce;
      datasources[1].select.should.have.been.calledWith({ choice: 3 });
    });

    it('should return an error when executing an unsupported query', function (done) {
      datasource.select({ choice: 0 }, function (error) {
        expect(error).to.be.an.instanceof(Error);
        error.message.should.equal('The datasource does not support the given query');
        done();
      });
    });
  });
});
