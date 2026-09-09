/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import * as http from 'http';
import { vi, type Mock } from 'vitest';
import type { Controller } from '@ldf/core/lib/controllers/Controller';
import type { LdfRequest, LdfRequestWithUrl, LdfResponse } from '@ldf/core';

/* Dummy server that emulates LinkedDataFragmentsServer, tracking how the
   controller ultimately handled each request */
export class DummyServer extends http.Server {
  // Only set once a request has been handled
  next?: Mock<(error?: Error) => void>;
  error?: Error;

  constructor(controller: Controller) {
    super();
    this.on('request', (request: LdfRequest, response: LdfResponse) => {
      // End the response if the controller did not handle the request
      this.next = vi.fn((error?: Error) => {
        this.error = error;
        if (!response.headersSent)
          response.writeHead(error ? 500 : 200);
        response.end(error && error.message || '');
      });
      try { controller.handleRequest(request as LdfRequestWithUrl, response, this.next); }
      catch (error) { this.next(error as Error); }
    });
  }
}
