/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
let LinkedDataFragmentsServer = require('../lib/LinkedDataFragmentsServer').LinkedDataFragmentsServer; // changed to make tests pass, will be revised in follow up pr

let request = require('supertest'),
    UrlData = require('../lib/UrlData').UrlData,
    net = require('net'),
    path = require('path'),
    fs = require('fs');

let testCertFile = path.join(__dirname, '../../../test/assets/test-cert.pem'),
    testKeyFile = path.join(__dirname, '../../../test/assets/test-key.pem');

describe('LinkedDataFragmentsServer', () => {
  describe('A LinkedDataFragmentsServer instance with one controller', () => {
    let server, controller, client;
    before(() => {
      controller = {
        handleRequest: sinon.spy((request, response, next) => {
          switch (request.url) {
          case '/handle':
            response.end('body contents');
            break;
          case '/error':
            throw new Error('error message');
          default:
            next();
          }
        }),
      };
      server = new LinkedDataFragmentsServer({
        controllers: [controller],
        log: sinon.stub(),
        protocol: 'http',
        response: {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'My-Header': 'value',
          },
        },
      });
      client = request.agent(server);
    });
    beforeEach(() => {
      controller.handleRequest.reset();
    });

    it('should send the configured headers', (done) => {
      client.head('/').expect((response) => {
        response.headers.should.have.property('access-control-allow-origin', '*');
        response.headers.should.have.property('my-header', 'value');
      }).end(done);
    });

    it('should not allow POST requests', (done) => {
      client.post('/').expect((response) => {
        controller.handleRequest.should.not.have.been.called;
        response.should.have.property('statusCode', 405);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
      }).end(done);
    });

    it('should send a body with GET requests', (done) => {
      client.get('/handle').expect((response) => {
        controller.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', 'body contents');
      }).end(done);
    });

    it('should not send a body with HEAD requests', (done) => {
      client.head('/handle').expect((response) => {
        controller.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 200);
        response.body.should.not.have.property('length');
      }).end(done);
    });

    it('should not send a body with OPTIONS requests', (done) => {
      client.options('/handle').expect((response) => {
        controller.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', '');
      }).end(done);
    });

    it('should error when the controller cannot handle the request', (done) => {
      client.get('/unsupported').expect((response) => {
        controller.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: No controller for /unsupported\n');
      }).end(done);
    });

    it('should error when the controller errors', (done) => {
      client.get('/error').expect((response) => {
        controller.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: error message\n');
      }).end(done);
    });
  });

  describe('A LinkedDataFragmentsServer instance with two controllers', () => {
    let server, controllerA, controllerB, client;
    before(() => {
      controllerA = {
        handleRequest: sinon.spy((request, response, next) => {
          switch (request.url) {
          case '/handleA':
            response.end('body contents A');
            break;
          case '/errorA':
            throw new Error('error message A');
          default:
            next();
          }
        }),
      };
      controllerB = {
        handleRequest: sinon.spy((request, response, next) => {
          switch (request.url) {
          case '/handleB':
            response.end('body contents B');
            break;
          case '/errorB':
            next(new Error('error message B'));
            break;
          default:
            next();
          }
        }),
      };
      server = new LinkedDataFragmentsServer({
        controllers: [controllerA, controllerB],
        protocol: 'http',
        log: sinon.stub(),
      });
      client = request.agent(server);
    });
    beforeEach(() => {
      controllerA.handleRequest.reset();
      controllerB.handleRequest.reset();
    });

    it('should not allow POST requests', (done) => {
      client.post('/').expect((response) => {
        controllerA.handleRequest.should.not.have.been.called;
        controllerB.handleRequest.should.not.have.been.called;
        response.should.have.property('statusCode', 405);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
      }).end(done);
    });

    it('should use the first controller when it can handle the request', (done) => {
      client.get('/handleA').expect((response) => {
        controllerA.handleRequest.should.have.been.calledOnce;
        controllerB.handleRequest.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', 'body contents A');
      }).end(done);
    });

    it('should use the second controller when the first cannot handle the request', (done) => {
      client.get('/handleB').expect((response) => {
        controllerA.handleRequest.should.have.been.calledOnce;
        controllerB.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', 'body contents B');
      }).end(done);
    });

    it('should error when neither controller can handle the request', (done) => {
      client.get('/unsupported').expect((response) => {
        controllerA.handleRequest.should.have.been.calledOnce;
        controllerB.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: No controller for /unsupported\n');
      }).end(done);
    });

    it('should error when the first controller errors', (done) => {
      client.get('/errorA').expect((response) => {
        controllerA.handleRequest.should.have.been.calledOnce;
        controllerB.handleRequest.should.not.have.been.called;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: error message A\n');
      }).end(done);
    });

    it('should error when the second controller errors', (done) => {
      client.get('/errorB').expect((response) => {
        controllerA.handleRequest.should.have.been.calledOnce;
        controllerB.handleRequest.should.have.been.calledOnce;
        response.should.have.property('statusCode', 500);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'Application error: error message B\n');
      }).end(done);
    });
  });

  describe('A LinkedDataFragmentsServer instance with the https protocol', () => {
    it('should create an https server', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: testCertFile, key: testKeyFile } },
        log: sinon.stub(),
      });
      server.should.be.an.instanceof(require('https').Server);
    });

    it('should accept an array of key material values', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: [testCertFile], key: testKeyFile } },
        log: sinon.stub(),
      });
      server.should.be.an.instanceof(require('https').Server);
    });

    it('should require a client certificate when WebID authentication is enabled', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: testCertFile, key: testKeyFile } },
        authentication: { webid: true },
        log: sinon.stub(),
      });
      server.should.be.an.instanceof(require('https').Server);
    });

    it('should accept literal key material that is not a file path', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: fs.readFileSync(testCertFile, 'utf8'), key: fs.readFileSync(testKeyFile, 'utf8') } },
        log: sinon.stub(),
      });
      server.should.be.an.instanceof(require('https').Server);
    });
  });

  describe('A LinkedDataFragmentsServer instance with an invalid protocol', () => {
    it('should throw', () => {
      (function () {
        // eslint-disable-next-line no-new
        new LinkedDataFragmentsServer({ urlData: new UrlData({ protocol: 'ftp' }), log: sinon.stub() });
      }).should.throw('The configured protocol ftp is invalid.');
    });
  });

  describe('A LinkedDataFragmentsServer instance handling a request that fails outside of a controller', () => {
    it('should report the error', (done) => {
      let server = new LinkedDataFragmentsServer({
        controllers: [], protocol: 'http', log: sinon.stub(),
        response: { headers: { 'Bad-Header': 'invalid\r\nvalue' } },
      });
      request.agent(server).get('/').expect((response) => {
        response.should.have.property('statusCode', 500);
      }).end(done);
    });
  });

  describe('A LinkedDataFragmentsServer instance reporting a fatal error', () => {
    it('should log the error and exit the process', () => {
      let exitStub = sinon.stub(process, 'exit'), logSpy = sinon.spy();
      let server = new LinkedDataFragmentsServer({ controllers: [], protocol: 'http', log: logSpy });
      let error = new Error('fatal error');
      server.emit('error', error);
      logSpy.should.have.been.calledWith('Fatal error, exiting process\n', error.stack);
      exitStub.should.have.been.calledWith(-1);
      exitStub.restore();
    });
  });

  describe('A LinkedDataFragmentsServer instance reporting an error on an already-handled response', () => {
    it('should end the response without reporting the error again', () => {
      let server = new LinkedDataFragmentsServer({ controllers: [], protocol: 'http', log: sinon.stub() });
      let endSpy = sinon.spy();
      let response = { headersSent: true, end: endSpy, setHeader: sinon.stub() };
      server._reportError({}, response, new Error('already handled'));
      endSpy.should.have.been.calledOnce;
    });
  });

  describe('A LinkedDataFragmentsServer instance whose error controller itself fails', () => {
    it('should log the secondary error', () => {
      let logSpy = sinon.spy();
      let server = new LinkedDataFragmentsServer({ controllers: [], protocol: 'http', log: logSpy });
      server._errorController.handleRequest = () => { throw new Error('error controller failed'); };
      let response = { headersSent: false, setHeader: sinon.stub() };
      server._reportError({}, response, new Error('original error'));
      logSpy.should.have.been.calledTwice;
      logSpy.secondCall.args[0].should.contain('error controller failed');
    });
  });

  describe('Stopping a LinkedDataFragmentsServer instance', () => {
    it('should destroy open sockets', (done) => {
      let server = new LinkedDataFragmentsServer({ controllers: [], protocol: 'http', log: sinon.stub() });
      server.listen(0, () => {
        let socket = net.connect(server.address().port, () => {
          setImmediate(() => {
            server.stop();
            socket.on('close', () => done());
          });
        });
      });
    });

    it('should close all controllers', () => {
      let closeSpy = sinon.spy();
      let controller = { handleRequest: sinon.spy(), close: closeSpy };
      let server = new LinkedDataFragmentsServer({ controllers: [controller], protocol: 'http', log: sinon.stub() });
      server.stop();
      closeSpy.should.have.been.calledOnce;
    });

    it('should tolerate a controller whose close() throws', () => {
      let logSpy = sinon.spy();
      let controller = { handleRequest: sinon.spy(), close: () => { throw new Error('close failed'); } };
      let server = new LinkedDataFragmentsServer({ controllers: [controller], protocol: 'http', log: logSpy });
      (function () { server.stop(); }).should.not.throw();
      logSpy.should.have.been.calledWith(sinon.match.instanceOf(Error));
    });
  });
});
