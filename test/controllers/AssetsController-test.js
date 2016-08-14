/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var AssetsController = require('../../lib/controllers/AssetsController');

var request = require('supertest'),
    DummyServer = require('./DummyServer'),
    fs = require('fs'),
    path = require('path');

describe('AssetsController', function () {
  describe('The AssetsController module', function () {
    it('should be a function', function () {
      AssetsController.should.be.a('function');
    });

    it('should be an AssetsController constructor', function () {
      new AssetsController().should.be.an.instanceof(AssetsController);
    });

    it('should create new AssetsController objects', function () {
      AssetsController().should.be.an.instanceof(AssetsController);
    });
  });

  describe('An AssetsController instance', function () {
    var controller, client;
    before(function () {
      controller = new AssetsController();
      client = request.agent(new DummyServer(controller));
    });

    it('should correctly serve SVG assets', function (done) {
      client.get('/assets/logo').expect(function (response) {
        var asset = fs.readFileSync(path.join(__dirname, '/../../assets/logo.svg'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/svg+xml');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.body.toString().should.equal(asset);
      }).end(done);
    });

    it('should correctly serve CSS assets', function (done) {
      client.get('/assets/style').expect(function (response) {
        var asset = fs.readFileSync(path.join(__dirname, '/../../assets/style.css'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'text/css;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should correctly serve ICO assets', function (done) {
      client.get('/favicon.ico').expect(function (response) {
        var asset = fs.readFileSync(path.join(__dirname, '/../../assets/favicon.ico'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/x-icon');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.body.toString().should.equal(asset);
      }).end(done);
    });

    it('should hand over to the next controller if no asset with that name is found', function (done) {
      client.get('/assets/unknown').expect(function (response) {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });

    it('should hand over to the next controller for non-asset paths', function (done) {
      client.get('/other').expect(function (response) {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });
  });
});
