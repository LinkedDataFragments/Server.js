/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
import { IncomingMessage, ServerResponse, type Server } from 'http';
import { Socket } from 'net';
import { EventEmitter, once } from 'events';
import { inject } from 'light-my-request';
import type { LdfRequest, LdfResponse } from '../packages/core/lib/types';

/**
 * Starts the given server on an ephemeral port, runs the callback with its base URL, then closes it.
 * Only needed for servers whose error handling relies on emitting 'error' on the response as a
 * recoverable signal (LinkedDataFragmentsServer): light-my-request's request() below treats any
 * such 'error' event as fatal to the whole injected exchange.
 * @param server - The HTTP server to start.
 * @param callback - Called with the server's base URL once it is listening.
 * @returns The value resolved by callback.
 */
export async function withServer<T>(server: Server, callback: (baseUrl: string) => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Expected the server to report a network address');
    return await callback(`http://localhost:${address.port}`);
  }
  finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

/**
 * Simulates an HTTP request against the given server without opening a real port.
 * @param server - The HTTP server to dispatch the request to.
 * @param path - The request path, including any query string.
 * @param init - Optional request headers.
 * @returns The response's status, headers, and body text.
 */
export async function request(server: Server, path: string, init: { headers?: Record<string, string> } = {}) {
  const response = await inject((req, res) => server.emit('request', req, res), {
    url: path,
    headers: init.headers,
    Request: IncomingMessage,
  });
  return {
    status: response.statusCode,
    headers: {
      get(name: string) {
        const value = response.headers[name.toLowerCase()];
        return Array.isArray(value) ? value.join(', ') : value === undefined ? null : String(value);
      },
    },
    text: () => Promise.resolve(response.payload),
  };
}

// A dummy incoming request, as returned by createRequest
export function createRequest(headers: Record<string, string> = {}): LdfRequest {
  const request = new IncomingMessage(new Socket());
  Object.assign(request.headers, headers);
  return request;
}

// A dummy outgoing response tied to a dummy request, as returned by createResponse
export function createResponse(): LdfResponse {
  return new ServerResponse(createRequest());
}

// A dummy HTTP response, as returned by createHttpResponse
class HttpResponse extends IncomingMessage {
  override statusCode = 200;

  constructor(contentType: string) {
    super(new Socket());
    this.headers = { 'content-type': contentType };
  }

  override _read(): void {}
}

// Creates a dummy HTTP response
export function createHttpResponse(contents: string, contentType: string): HttpResponse {
  const response = new HttpResponse(contentType);
  setImmediate(() => { response.push(contents); response.push(null); });
  return response;
}

// An in-memory HTTP response, as returned by createStreamCapture
class StreamCapture extends ServerResponse {
  buffer = '';

  constructor() {
    super(new IncomingMessage(new Socket()));
  }

  override write(chunk: unknown): boolean {
    this.buffer += chunk;
    return true;
  }
}

// Creates an in-memory HTTP response that captures everything written to it
export function createStreamCapture(): StreamCapture {
  return new StreamCapture();
}

// Counts the elements in a stream and resolves once it ends
export async function streamLength(stream: EventEmitter): Promise<number> {
  let length = 0;
  stream.on('data', () => { length++; });
  await once(stream, 'end');
  return length;
}
