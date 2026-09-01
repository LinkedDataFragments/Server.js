/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { LinkedDataFragmentsServer } from '../lib/LinkedDataFragmentsServer';
import { Controller } from '../lib/controllers/Controller';
import type { LdfRequestWithUrl, LdfResponse } from '../index';
import { listen } from '../../../test/test-helpers';

describe('LinkedDataFragmentsServer', () => {
  describe('A LinkedDataFragmentsServer instance with one controller', () => {
    let baseUrl: string, controller: Controller;
    // Kept separate so .mockClear() has a Mock-typed target. controller.handleRequest's
    // declared type is just Controller's plain function signature, not Mock.
    let handleRequestSpy: Mock<Controller['handleRequest']>;
    beforeAll(async () => {
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
      baseUrl = await listen(new LinkedDataFragmentsServer({
        controllers: [controller],
        log: vi.fn(),
        response: {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'My-Header': 'value',
          },
        },
      }));
    });
    beforeEach(() => {
      handleRequestSpy.mockClear();
    });

    it('should send the configured headers', async () => {
      let response = await fetch(baseUrl + '/', { method: 'HEAD' });
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('my-header')).toBe('value');
    });

    it('should not allow POST requests', async () => {
      let response = await fetch(baseUrl + '/', { method: 'POST' });
      expect(controller.handleRequest).not.toHaveBeenCalled();
      expect(response.status).toBe(405);
      expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
      expect(await response.text()).toBe('The HTTP method "POST" is not allowed; try "GET" instead.');
    });

    it('should send a body with GET requests', async () => {
      let response = await fetch(baseUrl + '/handle');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('body contents');
    });

    it('should not send a body with HEAD requests', async () => {
      let response = await fetch(baseUrl + '/handle', { method: 'HEAD' });
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('');
    });

    it('should not send a body with OPTIONS requests', async () => {
      let response = await fetch(baseUrl + '/handle', { method: 'OPTIONS' });
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('');
    });

    it('should error when the controller cannot handle the request', async () => {
      let response = await fetch(baseUrl + '/unsupported');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
      expect(await response.text()).toBe('Application error: No controller for /unsupported\n');
    });

    it('should error when the controller errors', async () => {
      let response = await fetch(baseUrl + '/error');
      expect(controller.handleRequest).toHaveBeenCalledOnce();
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
      expect(await response.text()).toBe('Application error: error message\n');
    });
  });

  describe('A LinkedDataFragmentsServer instance with two controllers', () => {
    let baseUrl: string, controllerA: Controller, controllerB: Controller;
    // Kept separate so .mockClear() has a Mock-typed target. controllerX.handleRequest's
    // declared type is just Controller's plain function signature, not Mock.
    let handleRequestSpyA: Mock<Controller['handleRequest']>, handleRequestSpyB: Mock<Controller['handleRequest']>;
    beforeAll(async () => {
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
      baseUrl = await listen(new LinkedDataFragmentsServer({
        controllers: [controllerA, controllerB],
        log: vi.fn(),
      }));
    });
    beforeEach(() => {
      handleRequestSpyA.mockClear();
      handleRequestSpyB.mockClear();
    });

    it('should not allow POST requests', async () => {
      let response = await fetch(baseUrl + '/', { method: 'POST' });
      expect(controllerA.handleRequest).not.toHaveBeenCalled();
      expect(controllerB.handleRequest).not.toHaveBeenCalled();
      expect(response.status).toBe(405);
      expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
      expect(await response.text()).toBe('The HTTP method "POST" is not allowed; try "GET" instead.');
    });

    it('should use the first controller when it can handle the request', async () => {
      let response = await fetch(baseUrl + '/handleA');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('body contents A');
    });

    it('should use the second controller when the first cannot handle the request', async () => {
      let response = await fetch(baseUrl + '/handleB');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('body contents B');
    });

    it('should error when neither controller can handle the request', async () => {
      let response = await fetch(baseUrl + '/unsupported');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).toHaveBeenCalledOnce();
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
      expect(await response.text()).toBe('Application error: No controller for /unsupported\n');
    });

    it('should error when the first controller errors', async () => {
      let response = await fetch(baseUrl + '/errorA');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).not.toHaveBeenCalled();
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
      expect(await response.text()).toBe('Application error: error message A\n');
    });

    it('should error when the second controller errors', async () => {
      let response = await fetch(baseUrl + '/errorB');
      expect(controllerA.handleRequest).toHaveBeenCalledOnce();
      expect(controllerB.handleRequest).toHaveBeenCalledOnce();
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
      expect(await response.text()).toBe('Application error: error message B\n');
    });
  });
});
