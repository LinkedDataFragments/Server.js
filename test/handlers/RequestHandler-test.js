var RequestHandler = require('../../lib/handlers/RequestHandler');

var http = require('http'),
    request = require('supertest'),
    DummyServer = require('./DummyServer');

describe('RequestHandler', function () {
  describe('The RequestHandler module', function () {
    it('should be a function', function () {
      RequestHandler.should.be.a('function');
    });

    it('should be a RequestHandler constructor', function () {
      new RequestHandler().should.be.an.instanceof(RequestHandler);
    });

    it('should create new RequestHandler objects', function () {
      RequestHandler().should.be.an.instanceof(RequestHandler);
    });
  });

  describe('A RequestHandler instance without baseURL', function () {
    var handler, client;
    before(function () {
      handler = new RequestHandler();
      sinon.spy(handler, '_handleRequest');
      client = request.agent(new DummyServer(handler));
    });

    describe('receiving a request', function () {
      var response;
      before(function (done) {
        client.get('/path?a=b')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call _handleRequest with request and response', function () {
        handler._handleRequest.should.have.been.calledOnce;
        var args = handler._handleRequest.getCall(0).args;
        args.should.have.length(2);
        args[0].should.have.property('url');
        args[1].should.be.an.instanceof(http.ServerResponse);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', function () {
        handler._handleRequest.should.have.been.calledOnce;
        var request = handler._handleRequest.getCall(0).args[0];
        request.should.have.property('parsedUrl');
        request.parsedUrl.should.deep.equal({
          protocol: 'http:', host: request.headers.host, hostname: undefined, port: undefined,
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: undefined,
        });
      });

      it('should return false', function () {
        handler.result.should.be.false;
      });
    });
  });

  describe('A RequestHandler instance with baseURL', function () {
    var handler, client;
    before(function () {
      handler = new RequestHandler({ baseURL: 'http://example.org:1234/base?c=d#f' });
      sinon.spy(handler, '_handleRequest');
      client = request.agent(new DummyServer(handler));
    });

    describe('receiving a request', function () {
      var response;
      before(function (done) {
        client.get('/path?a=b')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call _handleRequest with request and response', function () {
        handler._handleRequest.should.have.been.calledOnce;
        var args = handler._handleRequest.getCall(0).args;
        args.should.have.length(2);
        args[0].should.have.property('url');
        args[1].should.be.an.instanceof(http.ServerResponse);
      });

      it('should extend _handleRequest with the rebased URL as parsedUrl property', function () {
        handler._handleRequest.should.have.been.calledOnce;
        var request = handler._handleRequest.getCall(0).args[0];
        request.should.have.property('parsedUrl');
        request.parsedUrl.should.deep.equal({
          protocol: 'http:', host: 'example.org:1234', hostname: 'example.org', port: "1234",
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: true,
        });
      });

      it('should return false', function () {
        handler.result.should.be.false;
      });
    });
  });
});
