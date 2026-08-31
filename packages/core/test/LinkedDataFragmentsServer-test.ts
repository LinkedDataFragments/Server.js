/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { LinkedDataFragmentsServer } from '../lib/LinkedDataFragmentsServer';
import { Controller } from '../lib/controllers/Controller';
import type { LdfRequestWithUrl, LdfResponse } from '../index';

import * as request from 'supertest';

describe('LinkedDataFragmentsServer', () => {
  describe('A LinkedDataFragmentsServer instance with one controller', () => {
    let server: ReturnType<typeof LinkedDataFragmentsServer>, controller: Controller, client: ReturnType<typeof request.agent>;
    // Kept separate so .mockClear() has a Mock-typed target. controller.handleRequest's
    // declared type is just Controller's plain function signature, not Mock.
    let handleRequestSpy: Mock<Controller['handleRequest']>;
    beforeAll(() => {
      controller = new Controller();
      handleRequestSpy = vi.fn((request: LdfRequestWithUrl, response: LdfResponse, next: (error?: Error) => void) => {
        switch (request.url) {
        case '/handle':
          response.end('body contents');
          break;
        case '/error':
          throw new Error('error message');
        default:
          next();
        }
      });
      controller.handleRequest = handleRequestSpy;
      server = new LinkedDataFragmentsServer({
        controllers: [controller],
        log: vi.fn(),
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
      handleRequestSpy.mockClear();
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
    let server: ReturnType<typeof LinkedDataFragmentsServer>, controllerA: Controller, controllerB: Controller, client: ReturnType<typeof request.agent>;
    // Kept separate so .mockClear() has a Mock-typed target. controllerX.handleRequest's
    // declared type is just Controller's plain function signature, not Mock.
    let handleRequestSpyA: Mock<Controller['handleRequest']>, handleRequestSpyB: Mock<Controller['handleRequest']>;
    beforeAll(() => {
      controllerA = new Controller();
      handleRequestSpyA = vi.fn((request: LdfRequestWithUrl, response: LdfResponse, next: (error?: Error) => void) => {
        switch (request.url) {
        case '/handleA':
          response.end('body contents A');
          break;
        case '/errorA':
          throw new Error('error message A');
        default:
          next();
        }
      });
      controllerA.handleRequest = handleRequestSpyA;
      controllerB = new Controller();
      handleRequestSpyB = vi.fn((request: LdfRequestWithUrl, response: LdfResponse, next: (error?: Error) => void) => {
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
      });
      controllerB.handleRequest = handleRequestSpyB;
      server = new LinkedDataFragmentsServer({
        controllers: [controllerA, controllerB],
        log: vi.fn(),
      });
      client = request.agent(server);
    });
    beforeEach(() => {
      handleRequestSpyA.mockClear();
      handleRequestSpyB.mockClear();
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
