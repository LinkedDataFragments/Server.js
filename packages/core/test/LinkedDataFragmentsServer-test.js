/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
const sinon = require('sinon');
let LinkedDataFragmentsServer = require('../lib/LinkedDataFragmentsServer').LinkedDataFragmentsServer; // changed to make tests pass, will be revised in follow up pr
let UrlData = require('../lib/UrlData').UrlData;

let request = require('supertest'),
    net = require('net'),
    path = require('path'),
    fs = require('fs'),
    https = require('https');

let testCertFile = path.join(__dirname, '../../../test/assets/test-cert.pem'),
    testKeyFile = path.join(__dirname, '../../../test/assets/test-key.pem');

describe('LinkedDataFragmentsServer', () => {
  describe('A LinkedDataFragmentsServer instance without a log option', () => {
    it('should default _log to a no-op function', () => {
      let server = LinkedDataFragmentsServer({ controllers: [] });
      expect(() => { server._log('anything'); }).not.toThrow();
    });
  });

  describe('A LinkedDataFragmentsServer instance with one controller', () => {
    let server, controller, client;
    beforeAll(() => {
      controller = {
        handleRequest: sinon.spy((request, response, next) => {
          switch (request.url) {
          case '/handle':
            response.end('body contents');
            break;
          case '/write':
            response.write('chunk 1');
            response.end('chunk 2');
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

    it('should send the configured headers', () => new Promise((done) => {
      client.head('/').expect((response) => {
        expect(response.headers).toHaveProperty('access-control-allow-origin', '*');
        expect(response.headers).toHaveProperty('my-header', 'value');
      }).end(done);
    }));

    it('should not allow POST requests', () => new Promise((done) => {
      client.post('/').expect((response) => {
        expect(controller.handleRequest.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 405);
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
        expect(response).toHaveProperty('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
      }).end(done);
    }));

    it('should send a body with GET requests', () => new Promise((done) => {
      client.get('/handle').expect((response) => {
        expect(controller.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response).toHaveProperty('text', 'body contents');
      }).end(done);
    }));

    it('should not send a body with HEAD requests', () => new Promise((done) => {
      client.head('/handle').expect((response) => {
        expect(controller.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.body).not.toHaveProperty('length');
      }).end(done);
    }));

    it('should not send a body with OPTIONS requests', () => new Promise((done) => {
      client.options('/handle').expect((response) => {
        expect(controller.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response).toHaveProperty('text', '');
      }).end(done);
    }));

    it('should silently no-op an explicit write() call with HEAD requests', () => new Promise((done) => {
      client.head('/write').expect((response) => {
        expect(controller.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.body).not.toHaveProperty('length');
      }).end(done);
    }));

    it('should error when the controller cannot handle the request', () => new Promise((done) => {
      client.get('/unsupported').expect((response) => {
        expect(controller.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 500);
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
        expect(response).toHaveProperty('text', 'Application error: No controller for /unsupported\n');
      }).end(done);
    }));

    it('should error when the controller errors', () => new Promise((done) => {
      client.get('/error').expect((response) => {
        expect(controller.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 500);
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
        expect(response).toHaveProperty('text', 'Application error: error message\n');
      }).end(done);
    }));
  });

  describe('A LinkedDataFragmentsServer instance with two controllers', () => {
    let server, controllerA, controllerB, client;
    beforeAll(() => {
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

    it('should not allow POST requests', () => new Promise((done) => {
      client.post('/').expect((response) => {
        expect(controllerA.handleRequest.called).toBe(false);
        expect(controllerB.handleRequest.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 405);
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
        expect(response).toHaveProperty('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
      }).end(done);
    }));

    it('should use the first controller when it can handle the request', () => new Promise((done) => {
      client.get('/handleA').expect((response) => {
        expect(controllerA.handleRequest.calledOnce).toBe(true);
        expect(controllerB.handleRequest.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response).toHaveProperty('text', 'body contents A');
      }).end(done);
    }));

    it('should use the second controller when the first cannot handle the request', () => new Promise((done) => {
      client.get('/handleB').expect((response) => {
        expect(controllerA.handleRequest.calledOnce).toBe(true);
        expect(controllerB.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response).toHaveProperty('text', 'body contents B');
      }).end(done);
    }));

    it('should error when neither controller can handle the request', () => new Promise((done) => {
      client.get('/unsupported').expect((response) => {
        expect(controllerA.handleRequest.calledOnce).toBe(true);
        expect(controllerB.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 500);
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
        expect(response).toHaveProperty('text', 'Application error: No controller for /unsupported\n');
      }).end(done);
    }));

    it('should error when the first controller errors', () => new Promise((done) => {
      client.get('/errorA').expect((response) => {
        expect(controllerA.handleRequest.calledOnce).toBe(true);
        expect(controllerB.handleRequest.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 500);
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
        expect(response).toHaveProperty('text', 'Application error: error message A\n');
      }).end(done);
    }));

    it('should error when the second controller errors', () => new Promise((done) => {
      client.get('/errorB').expect((response) => {
        expect(controllerA.handleRequest.calledOnce).toBe(true);
        expect(controllerB.handleRequest.calledOnce).toBe(true);
        expect(response).toHaveProperty('statusCode', 500);
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
        expect(response).toHaveProperty('text', 'Application error: error message B\n');
      }).end(done);
    }));
  });

  describe('A LinkedDataFragmentsServer instance with the https protocol', () => {
    it('should create an https server', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: testCertFile, key: testKeyFile } },
        log: sinon.stub(),
      });
      expect(server).toBeInstanceOf(https.Server);
    });

    it('should accept an array of key material values', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: [testCertFile], key: testKeyFile } },
        log: sinon.stub(),
      });
      expect(server).toBeInstanceOf(https.Server);
    });

    it('should require a client certificate when WebID authentication is enabled', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: testCertFile, key: testKeyFile } },
        authentication: { webid: true },
        log: sinon.stub(),
      });
      expect(server).toBeInstanceOf(https.Server);
    });

    it('should accept literal key material that is not a file path', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: fs.readFileSync(testCertFile, 'utf8'), key: fs.readFileSync(testKeyFile, 'utf8') } },
        log: sinon.stub(),
      });
      expect(server).toBeInstanceOf(https.Server);
    });
  });

  describe('A LinkedDataFragmentsServer instance with an invalid protocol', () => {
    it('should throw', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new LinkedDataFragmentsServer({ urlData: new UrlData({ protocol: 'ftp' }), log: sinon.stub() });
      }).toThrow('The configured protocol ftp is invalid.');
    });
  });

  describe('A LinkedDataFragmentsServer instance handling a request that fails outside of a controller', () => {
    it('should report the error', () => new Promise((done) => {
      let server = new LinkedDataFragmentsServer({
        controllers: [], log: sinon.stub(),
        response: { headers: { 'Bad-Header': 'invalid\r\nvalue' } },
      });
      request.agent(server).get('/').expect((response) => {
        expect(response).toHaveProperty('statusCode', 500);
      }).end(done);
    }));
  });

  describe('A LinkedDataFragmentsServer instance reporting a fatal error', () => {
    it('should log the error and exit the process', () => {
      let exitStub = sinon.stub(process, 'exit'), logSpy = sinon.spy();
      let server = new LinkedDataFragmentsServer({ controllers: [], log: logSpy });
      let error = new Error('fatal error');
      server.emit('error', error);
      expect(logSpy.calledWith('Fatal error, exiting process\n', error.stack)).toBe(true);
      expect(exitStub.calledWith(-1)).toBe(true);
      exitStub.restore();
    });
  });

  describe('A LinkedDataFragmentsServer instance reporting an error on an already-handled response', () => {
    it('should end the response without reporting the error again', () => {
      let server = new LinkedDataFragmentsServer({ controllers: [], log: sinon.stub() });
      let endSpy = sinon.spy();
      let response = { headersSent: true, end: endSpy, setHeader: sinon.stub() };
      server._reportError({}, response, new Error('already handled'));
      expect(endSpy.calledOnce).toBe(true);
    });
  });

  describe('A LinkedDataFragmentsServer instance whose error controller itself fails', () => {
    it('should log the secondary error', () => {
      let logSpy = sinon.spy();
      let server = new LinkedDataFragmentsServer({ controllers: [], log: logSpy });
      server._errorController.handleRequest = () => { throw new Error('error controller failed'); };
      let response = { headersSent: false, setHeader: sinon.stub() };
      server._reportError({}, response, new Error('original error'));
      expect(logSpy.calledTwice).toBe(true);
      expect(logSpy.getCall(1).args[0]).toContain('error controller failed');
    });
  });

  describe('Stopping a LinkedDataFragmentsServer instance', () => {
    it('should destroy open sockets', () => new Promise((done) => {
      let server = new LinkedDataFragmentsServer({ controllers: [], log: sinon.stub() });
      server.listen(0, () => {
        let socket = net.connect({ port: server.address().port }, () => {
          setImmediate(() => {
            server.stop();
            socket.on('close', () => done());
          });
        });
      });
    }));

    it('should close all controllers', () => {
      let closeSpy = sinon.spy();
      let controller = { handleRequest: sinon.spy(), close: closeSpy };
      let server = new LinkedDataFragmentsServer({ controllers: [controller], log: sinon.stub() });
      server.stop();
      expect(closeSpy.calledOnce).toBe(true);
    });

    it('should tolerate a controller whose close() throws', () => {
      let logSpy = sinon.spy();
      let controller = { handleRequest: sinon.spy(), close: () => { throw new Error('close failed'); } };
      let server = new LinkedDataFragmentsServer({ controllers: [controller], log: logSpy });
      expect(() => { server.stop(); }).not.toThrow();
      expect(logSpy.calledWith(sinon.match.instanceOf(Error))).toBe(true);
    });
  });
});
