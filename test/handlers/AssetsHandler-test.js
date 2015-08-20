var AssetsHandler = require('../../lib/handlers/AssetsHandler');

var request = require('supertest'),
    DummyServer = require('./DummyServer'),
    fs = require('fs');

describe('AssetsHandler', function () {
  describe('The AssetsHandler module', function () {
    it('should be a function', function () {
      AssetsHandler.should.be.a('function');
    });

    it('should be an AssetsHandler constructor', function () {
      new AssetsHandler().should.be.an.instanceof(AssetsHandler);
    });

    it('should create new AssetsHandler objects', function () {
      AssetsHandler().should.be.an.instanceof(AssetsHandler);
    });
  });

  describe('An AssetsHandler instance', function () {
    var handler, client;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
      };
      var router = { extractQueryParams: function (request, query) {
        query.features.datasource = true;
        query.datasource = request.url.pathname.substr(1);
      }};
      handler = new AssetsHandler();
      client = request.agent(new DummyServer(handler));
    });

    it('should correctly serve SVG assets', function (done) {
      client.get('/assets/logo').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../../assets/logo.svg', 'utf8');
        handler.result.should.be.true;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/svg+xml');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should correctly serve CSS assets', function (done) {
      client.get('/assets/style').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../../assets/style.css', 'utf8');
        handler.result.should.be.true;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'text/css;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should correctly serve ICO assets', function (done) {
      client.get('/favicon.ico').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../../assets/favicon.ico', 'utf8');
        handler.result.should.be.true;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/x-icon');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should return false if no asset with that name is found', function (done) {
      client.get('/assets/unknown').expect(function (response) {
        handler.result.should.be.false;
      }).end(done);
    });

    it('should return false for non-asset paths', function (done) {
      client.get('/other').expect(function (response) {
        handler.result.should.be.false;
      }).end(done);
    });
  });
});
