/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var Controller = require('../../lib/controllers/Controller');

var http = require('http'),
    request = require('supertest'),
    DummyServer = require('./DummyServer');

describe('Controller', function () {
  describe('The Controller module', function () {
    it('should be a function', function () {
      Controller.should.be.a('function');
    });

    it('should be a Controller constructor', function () {
      new Controller().should.be.an.instanceof(Controller);
    });

    it('should create new Controller objects', function () {
      Controller().should.be.an.instanceof(Controller);
    });
  });

  describe('A Controller instance without baseURL', function () {
    var controller, client;
    before(function () {
      controller = new Controller();
      sinon.spy(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', function () {
      before(function (done) {
        client.get('/path?a=b').end(done);
      });

      it('should call _handleRequest with request, response and next', function () {
        controller._handleRequest.should.have.been.calledOnce;
        var args = controller._handleRequest.getCall(0).args;
        args.should.have.length(3);
        args[0].should.have.property('url');
        args[1].should.be.an.instanceof(http.ServerResponse);
        args[2].should.be.an.instanceof(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', function () {
        controller._handleRequest.should.have.been.calledOnce;
        var request = controller._handleRequest.getCall(0).args[0];
        request.should.have.property('parsedUrl');
        request.parsedUrl.should.deep.equal({
          protocol: 'http:', host: request.headers.host, hostname: undefined, port: undefined,
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: undefined,
        });
      });

      it('should hand over to the next controller', function () {
        controller.next.should.have.been.calledOnce;
      });
    });
  });

  describe('A Controller instance with baseURL', function () {
    var controller, client;
    before(function () {
      controller = new Controller({ baseURL: 'http://example.org:1234/base?c=d#f' });
      sinon.spy(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', function () {
      before(function (done) {
        client.get('/path?a=b').end(done);
      });

      it('should call _handleRequest with request, response and next', function () {
        controller._handleRequest.should.have.been.calledOnce;
        var args = controller._handleRequest.getCall(0).args;
        args.should.have.length(3);
        args[0].should.have.property('url');
        args[1].should.be.an.instanceof(http.ServerResponse);
        args[2].should.be.an.instanceof(Function);
      });

      it('should extend _handleRequest with the rebased URL as parsedUrl property', function () {
        controller._handleRequest.should.have.been.calledOnce;
        var request = controller._handleRequest.getCall(0).args[0];
        request.should.have.property('parsedUrl');
        request.parsedUrl.should.deep.equal({
          protocol: 'http:', host: 'example.org:1234', hostname: 'example.org', port: '1234',
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: true,
        });
      });

      it('should hand over to the next controller', function () {
        controller.next.should.have.been.calledOnce;
      });
    });
  });
});
