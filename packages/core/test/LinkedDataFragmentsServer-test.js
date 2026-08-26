/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
let LinkedDataFragmentsServer = require('../lib/LinkedDataFragmentsServer').LinkedDataFragmentsServer; // changed to make tests pass, will be revised in follow up pr

let request = require('supertest');

describe('LinkedDataFragmentsServer', () => {
  describe('A LinkedDataFragmentsServer instance with one controller', () => {
    let server, controller, client;
    beforeAll(() => {
      controller = {
        handleRequest: vi.fn((request, response, next) => {
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
});
