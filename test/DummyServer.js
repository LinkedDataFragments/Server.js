/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import * as http from 'http';
import { vi } from 'vitest';

/* Dummy server that emulates LinkedDataFragmentsServer */
function DummyServer(controller) {
  const server = http.createServer();
  server.on('request', (request, response) => {
    // End the response if the controller did not handle the request
    controller.next = vi.fn((error) => {
      controller.error = error;
      if (!response.headersSent)
        response.writeHead(error ? 500 : 200);
      response.end(error && error.message || '');
    });
    try { controller.result = controller.handleRequest(request, response, controller.next); }
    catch (error) { controller.next(error); }
  });
  return server;
}

export default DummyServer;
