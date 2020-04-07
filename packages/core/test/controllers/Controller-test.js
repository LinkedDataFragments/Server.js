/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let Controller = require('../../lib/controllers/Controller'),
    UrlData = require('../../lib/UrlData');

let http = require('http'),
    request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer');

describe('Controller', () => {
  describe('The Controller module', () => {
    it('should be a function', () => {
      Controller.should.be.a('function');
    });

    it('should be a Controller constructor', () => {
      new Controller().should.be.an.instanceof(Controller);
    });
  });

  describe('A Controller instance without baseURL', () => {
    let controller, client;
    before(() => {
      controller = new Controller();
      sinon.spy(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', () => {
      before((done) => {
        client.get('/path?a=b').end(done);
      });

      it('should call _handleRequest with request, response and next', () => {
        controller._handleRequest.should.have.been.calledOnce;
        let args = controller._handleRequest.getCall(0).args;
        args[0].should.have.property('url');
        args[1].should.be.an.instanceof(http.ServerResponse);
        args[2].should.be.an.instanceof(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        controller._handleRequest.should.have.been.calledOnce;
        let request = controller._handleRequest.getCall(0).args[0];
        request.should.have.property('parsedUrl');
        request.parsedUrl.should.deep.equal({
          protocol: 'http:', host: request.headers.host, hostname: undefined, port: undefined,
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: undefined,
        });
      });

      it('should hand over to the next controller', () => {
        controller.next.should.have.been.calledOnce;
      });
    });
  });

  describe('A Controller instance without baseURL using Forwarded header', () => {
    let controller, client;
    before(() => {
      controller = new Controller({ urlData: new UrlData({ baseURL: 'http://example.org:1234/base?c=d#f' }) });
      sinon.spy(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', () => {
      before((done) => {
        client
          .get('/path?a=b')
          .set('X-Forwarded-Host', 'foo:5000')
          // NOTE: the priority will go to the Forwarded header over the X-Forwarded-Host header
          .set('Forwarded', 'proto=https;host="bar:8000"')
          .end(done);
      });

      it('should call _handleRequest with request, response and next', () => {
        controller._handleRequest.should.have.been.calledOnce;
        let args = controller._handleRequest.getCall(0).args;
        args[0].should.have.property('url');
        args[1].should.be.an.instanceof(http.ServerResponse);
        args[2].should.be.an.instanceof(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        controller._handleRequest.should.have.been.calledOnce;
        let request = controller._handleRequest.getCall(0).args[0];
        request.should.have.property('parsedUrl');
        request.parsedUrl.should.deep.equal({
          protocol: 'https:', host: 'bar:8000', hostname: 'example.org', port: '1234',
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: true,
        });
      });

      it('should hand over to the next controller', () => {
        controller.next.should.have.been.calledOnce;
      });
    });
  });

  describe('A Controller instance without baseURL using X-Forwarded-* headers', () => {
    let controller, client;
    before(() => {
      controller = new Controller();
      sinon.spy(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', () => {
      before((done) => {
        client
          .get('/path?a=b')
          .set('X-Forwarded-Host', 'foo:5000')
          .set('X-Forwarded-Proto', 'https')
          .end(done);
      });

      it('should call _handleRequest with request, response and next', () => {
        controller._handleRequest.should.have.been.calledOnce;
        let args = controller._handleRequest.getCall(0).args;
        args[0].should.have.property('url');
        args[1].should.be.an.instanceof(http.ServerResponse);
        args[2].should.be.an.instanceof(Function);
      });

      it('should extend _handleRequest with the original URL as parsedUrl property', () => {
        controller._handleRequest.should.have.been.calledOnce;
        let request = controller._handleRequest.getCall(0).args[0];
        request.should.have.property('parsedUrl');
        request.parsedUrl.should.deep.equal({
          protocol: 'https:', host: 'foo:5000', hostname: undefined, port: undefined,
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: undefined,
        });
      });

      it('should hand over to the next controller', () => {
        controller.next.should.have.been.calledOnce;
      });
    });
  });

  describe('A Controller instance with baseURL', () => {
    let controller, client;
    before(() => {
      controller = new Controller({ urlData: new UrlData({ baseURL: 'http://example.org:1234/base?c=d#f' }) });
      sinon.spy(controller, '_handleRequest');
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request', () => {
      before((done) => {
        client.get('/path?a=b').end(done);
      });

      it('should call _handleRequest with request, response and next', () => {
        controller._handleRequest.should.have.been.calledOnce;
        let args = controller._handleRequest.getCall(0).args;
        args[0].should.have.property('url');
        args[1].should.be.an.instanceof(http.ServerResponse);
        args[2].should.be.an.instanceof(Function);
      });

      it('should extend _handleRequest with the rebased URL as parsedUrl property', () => {
        controller._handleRequest.should.have.been.calledOnce;
        let request = controller._handleRequest.getCall(0).args[0];
        request.should.have.property('parsedUrl');
        request.parsedUrl.should.deep.equal({
          protocol: 'http:', host: 'example.org:1234', hostname: 'example.org', port: '1234',
          path: '/path?a=b', pathname: '/path', href: undefined, auth: undefined,
          query: { a: 'b' }, search: undefined, hash: undefined, slashes: true,
        });
      });

      it('should hand over to the next controller', () => {
        controller.next.should.have.been.calledOnce;
      });
    });
  });
});
