var LinkedDataFragmentsServer = require('../lib/LinkedDataFragmentsServer');

var request = require('supertest'),
    fs = require('fs'),
    http = require('http'),
    url = require('url');

describe('LinkedDataFragmentsServer', function () {
  describe('A LinkedDataFragmentsServer instance with one handler', function () {
    var server, handler, client;
    before(function () {
      handler = {
        handleRequest: sinon.spy(function (request, response) {
          switch (request.url) {
            case '/handle':
              return response.end('body contents'), true;
            case '/error':
              throw new Error('error message');
            default:
              return false;
          }
        }),
      };
      server = new LinkedDataFragmentsServer({
        handlers: [ handler ],
        log: sinon.stub(),
      });
      client = request.agent(server);
    });
    beforeEach(function () {
      handler.handleRequest.reset();
    });

    it('should send CORS headers', function (done) {
      client.head('/').expect(function (response) {
        response.headers.should.have.property('access-control-allow-origin', '*');
      }).end(done);
    });

    it('should not allow POST requests', function (done) {
      client.post('/').expect(function (response) {
        handler.handleRequest.should.not.have.been.called;
        response.should.have.property('statusCode', 405);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
      }).end(done);
    });

    it('should send a body with GET requests', function (done) {
      client.get('/handle').expect(function (response) {
        handler.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', 'body contents');
      }).end(done);
    });

    it('should not send a body with HEAD requests', function (done) {
      client.head('/handle').expect(function (response) {
        handler.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', '');
      }).end(done);
    });

    it('should not send a body with OPTIONS requests', function (done) {
      client.options('/handle').expect(function (response) {
        handler.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', '');
      }).end(done);
    });

    it('should error when the handler cannot handle the request', function (done) {
      client.get('/unsupported').expect(function (response) {
        handler.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: No handler for /unsupported');
      }).end(done);
    });

    it('should error when the handler errors', function (done) {
      client.get('/error').expect(function (response) {
        handler.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: error message');
      }).end(done);
    });
  });

  describe('A LinkedDataFragmentsServer instance with two handlers', function () {
    var server, handlerA, handlerB, client;
    before(function () {
      handlerA = {
        handleRequest: sinon.spy(function (request, response) {
          switch (request.url) {
            case '/handleA':
              return response.end('body contents A'), true;
            case '/errorA':
              throw new Error('error message A');
            default:
              return false;
          }
        }),
      };
      handlerB = {
        handleRequest: sinon.spy(function (request, response) {
          switch (request.url) {
            case '/handleB':
              return response.end('body contents B'), true;
            case '/errorB':
              throw new Error('error message B');
            default:
              return false;
          }
        }),
      };
      server = new LinkedDataFragmentsServer({
        handlers: [ handlerA, handlerB ],
        log: sinon.stub(),
      });
      client = request.agent(server);
    });
    beforeEach(function () {
      handlerA.handleRequest.reset();
      handlerB.handleRequest.reset();
    });

    it('should not allow POST requests', function (done) {
      client.post('/').expect(function (response) {
        handlerA.handleRequest.should.not.have.been.called;
        handlerB.handleRequest.should.not.have.been.called;
        response.should.have.property('statusCode', 405);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
      }).end(done);
    });

    it('should use the first handler when it can handle the request', function (done) {
      client.get('/handleA').expect(function (response) {
        handlerA.handleRequest.should.have.been.calledOnce;
        handlerB.handleRequest.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', 'body contents A');
      }).end(done);
    });

    it('should use the second handler when the first cannot handle the request', function (done) {
      client.get('/handleB').expect(function (response) {
        handlerA.handleRequest.should.have.been.calledOnce;
        handlerB.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', 'body contents B');
      }).end(done);
    });

    it('should error when neither handler can handle the request', function (done) {
      client.get('/unsupported').expect(function (response) {
        handlerA.handleRequest.should.have.been.calledOnce;
        handlerB.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: No handler for /unsupported');
      }).end(done);
    });

    it('should error when the first handler errors', function (done) {
      client.get('/errorA').expect(function (response) {
        handlerA.handleRequest.should.have.been.calledOnce;
        handlerB.handleRequest.should.not.have.been.called;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: error message A');
      }).end(done);
    });

    it('should error when the second handler errors', function (done) {
      client.get('/errorB').expect(function (response) {
        handlerA.handleRequest.should.have.been.calledOnce;
        handlerB.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: error message B');
      }).end(done);
    });
  });
});
