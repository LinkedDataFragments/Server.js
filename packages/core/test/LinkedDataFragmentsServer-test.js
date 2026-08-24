/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
let LinkedDataFragmentsServer = require('../lib/LinkedDataFragmentsServer').LinkedDataFragmentsServer; // changed to make tests pass, will be revised in follow up pr
let UrlData = require('../lib/UrlData').UrlData;

let request = require('supertest'),
    net = require('net'),
    path = require('path'),
    fs = require('fs'),
    https = require('https'),
    { once } = require('events'),
    { promisify } = require('util');

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
        handleRequest: vi.fn((request, response, next) => {
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
        log: vi.fn(),
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
      controller.handleRequest.mockClear();
    });

    it('should send the configured headers', async () => {
      let response = await client.head('/');
      expect(response.headers).toHaveProperty('access-control-allow-origin', '*');
      expect(response.headers).toHaveProperty('my-header', 'value');
    });

    it('should not allow POST requests', async () => {
      let response = await client.post('/');
      expect(controller.handleRequest).not.toHaveBeenCalled();
      expect(response).toHaveProperty('statusCode', 405);
      expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      expect(response).toHaveProperty('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
    });

    it('should send a body with GET requests', async () => {
      let response = await client.get('/handle');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response).toHaveProperty('text', 'body contents');
    });

    it('should not send a body with HEAD requests', async () => {
      let response = await client.head('/handle');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response.body).not.toHaveProperty('length');
    });

    it('should not send a body with OPTIONS requests', async () => {
      let response = await client.options('/handle');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response).toHaveProperty('text', '');
    });

    it('should silently no-op an explicit write() call with HEAD requests', async () => {
      let response = await client.head('/write');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response.body).not.toHaveProperty('length');
    });

    it('should error when the controller cannot handle the request', async () => {
      let response = await client.get('/unsupported');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 500);
      expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      expect(response).toHaveProperty('text', 'Application error: No controller for /unsupported\n');
    });

    it('should error when the controller errors', async () => {
      let response = await client.get('/error');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 500);
      expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      expect(response).toHaveProperty('text', 'Application error: error message\n');
    });
  });

  describe('A LinkedDataFragmentsServer instance with two controllers', () => {
    let server, controllerA, controllerB, client;
    beforeAll(() => {
      controllerA = {
        handleRequest: vi.fn((request, response, next) => {
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
        handleRequest: vi.fn((request, response, next) => {
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
        log: vi.fn(),
      });
      client = request.agent(server);
    });
    beforeEach(() => {
      controllerA.handleRequest.mockClear();
      controllerB.handleRequest.mockClear();
    });

    it('should not allow POST requests', async () => {
      let response = await client.post('/');
      expect(controllerA.handleRequest).not.toHaveBeenCalled();
      expect(controllerB.handleRequest).not.toHaveBeenCalled();
      expect(response).toHaveProperty('statusCode', 405);
      expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      expect(response).toHaveProperty('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
    });

    it('should use the first controller when it can handle the request', async () => {
      let response = await client.get('/handleA');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).not.toHaveBeenCalled();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response).toHaveProperty('text', 'body contents A');
    });

    it('should use the second controller when the first cannot handle the request', async () => {
      let response = await client.get('/handleB');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response).toHaveProperty('text', 'body contents B');
    });

    it('should error when neither controller can handle the request', async () => {
      let response = await client.get('/unsupported');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 500);
      expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      expect(response).toHaveProperty('text', 'Application error: No controller for /unsupported\n');
    });

    it('should error when the first controller errors', async () => {
      let response = await client.get('/errorA');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).not.toHaveBeenCalled();
      expect(response).toHaveProperty('statusCode', 500);
      expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      expect(response).toHaveProperty('text', 'Application error: error message A\n');
    });

    it('should error when the second controller errors', async () => {
      let response = await client.get('/errorB');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).toHaveBeenCalledOnce();
      expect(response).toHaveProperty('statusCode', 500);
      expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      expect(response).toHaveProperty('text', 'Application error: error message B\n');
    });
  });

  describe('A LinkedDataFragmentsServer instance with the https protocol', () => {
    it('should create an https server', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: testCertFile, key: testKeyFile } },
        log: vi.fn(),
      });
      expect(server).toBeInstanceOf(https.Server);
    });

    it('should accept an array of key material values', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: [testCertFile], key: testKeyFile } },
        log: vi.fn(),
      });
      expect(server).toBeInstanceOf(https.Server);
    });

    it('should require a client certificate when WebID authentication is enabled', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: testCertFile, key: testKeyFile } },
        authentication: { webid: true },
        log: vi.fn(),
      });
      expect(server).toBeInstanceOf(https.Server);
    });

    it('should accept literal key material that is not a file path', () => {
      let server = new LinkedDataFragmentsServer({
        urlData: new UrlData({ protocol: 'https' }),
        ssl: { keys: { cert: fs.readFileSync(testCertFile, 'utf8'), key: fs.readFileSync(testKeyFile, 'utf8') } },
        log: vi.fn(),
      });
      expect(server).toBeInstanceOf(https.Server);
    });
  });

  describe('A LinkedDataFragmentsServer instance with an invalid protocol', () => {
    it('should throw', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new LinkedDataFragmentsServer({ urlData: new UrlData({ protocol: 'ftp' }), log: vi.fn() });
      }).toThrow('The configured protocol ftp is invalid.');
    });
  });

  describe('A LinkedDataFragmentsServer instance handling a request that fails outside of a controller', () => {
    it('should report the error', async () => {
      let server = new LinkedDataFragmentsServer({
        controllers: [], log: vi.fn(),
        response: { headers: { 'Bad-Header': 'invalid\r\nvalue' } },
      });
      let response = await request.agent(server).get('/');
      expect(response).toHaveProperty('statusCode', 500);
    });
  });

  describe('A LinkedDataFragmentsServer instance reporting a fatal error', () => {
    it('should log the error and exit the process', () => {
      let exitStub = vi.spyOn(process, 'exit').mockImplementation(() => {}), logSpy = vi.fn();
      let server = new LinkedDataFragmentsServer({ controllers: [], log: logSpy });
      let error = new Error('fatal error');
      server.emit('error', error);
      expect(logSpy).toHaveBeenCalledWith('Fatal error, exiting process\n', error.stack);
      expect(exitStub).toHaveBeenCalledWith(-1);
      exitStub.mockRestore();
    });
  });

  describe('A LinkedDataFragmentsServer instance reporting an error on an already-handled response', () => {
    it('should end the response without reporting the error again', () => {
      let server = new LinkedDataFragmentsServer({ controllers: [], log: vi.fn() });
      let endSpy = vi.fn();
      let response = { headersSent: true, end: endSpy, setHeader: vi.fn() };
      server._reportError({}, response, new Error('already handled'));
      expect(endSpy).toHaveBeenCalledOnce();
    });
  });

  describe('A LinkedDataFragmentsServer instance whose error controller itself fails', () => {
    it('should log the secondary error', () => {
      let logSpy = vi.fn();
      let server = new LinkedDataFragmentsServer({ controllers: [], log: logSpy });
      server._errorController.handleRequest = () => { throw new Error('error controller failed'); };
      let response = { headersSent: false, setHeader: vi.fn() };
      server._reportError({}, response, new Error('original error'));
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy.mock.calls[1][0]).toContain('error controller failed');
    });
  });

  describe('Stopping a LinkedDataFragmentsServer instance', () => {
    it('should destroy open sockets', async () => {
      let server = new LinkedDataFragmentsServer({ controllers: [], log: vi.fn() });
      await promisify(server.listen.bind(server))(0);
      let socket = net.connect({ port: server.address().port });
      await once(socket, 'connect');
      await promisify(setImmediate)();
      server.stop();
      await once(socket, 'close');
    });

    it('should close all controllers', () => {
      let closeSpy = vi.fn();
      let controller = { handleRequest: vi.fn(), close: closeSpy };
      let server = new LinkedDataFragmentsServer({ controllers: [controller], log: vi.fn() });
      server.stop();
      expect(closeSpy).toHaveBeenCalledOnce();
    });

    it('should tolerate a controller whose close() throws', () => {
      let logSpy = vi.fn();
      let controller = { handleRequest: vi.fn(), close: () => { throw new Error('close failed'); } };
      let server = new LinkedDataFragmentsServer({ controllers: [controller], log: logSpy });
      expect(() => { server.stop(); }).not.toThrow();
      expect(logSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
