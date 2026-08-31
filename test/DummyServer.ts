/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import * as http from 'http';
import { vi, type Mock } from 'vitest';
import type { Controller } from '@ldf/core/lib/controllers/Controller';
import type { LdfRequest, LdfRequestWithUrl, LdfResponse } from '@ldf/core';

// The bookkeeping DummyServer attaches to a controller so a test can inspect
// how the request was ultimately handled
export interface SpiedController {
  next: Mock<(error?: Error) => void>;
  error?: Error;
}

/* Dummy server that emulates LinkedDataFragmentsServer */
export function DummyServer(controller: Controller & Partial<SpiedController>): http.Server {
  const server = http.createServer();
  server.on('request', (request: LdfRequest, response: LdfResponse) => {
    // End the response if the controller did not handle the request
    const next: Mock<(error?: Error) => void> = vi.fn((error?: Error) => {
      controller.error = error;
      if (!response.headersSent)
        response.writeHead(error ? 500 : 200);
      response.end(error && error.message || '');
    });
    controller.next = next;
    try { controller.handleRequest(request as LdfRequestWithUrl, response, next); }
    catch (error) { next(error as Error); }
  });
  return server;
}
