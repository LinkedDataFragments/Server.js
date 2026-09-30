/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
import { it, expect } from 'vitest';
import { parse as parseUrl } from 'url';
import { IncomingMessage, ServerResponse, type Server } from 'http';
import { Socket } from 'net';
import { EventEmitter, once } from 'events';
import { inject } from 'light-my-request';
import type { InjectOptions } from 'light-my-request';
import type { LdfRequest, LdfResponse, Query, Router } from '../packages/core/lib/types';

export type FetchLikeInit = Pick<InjectOptions, 'method' | 'headers'>;

export interface FetchLikeResponse {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

// Starts the given server on an ephemeral port, runs callback with its base URL, then closes it.
// Only needed for servers whose error handling relies on emitting 'error' on the
// response as a recoverable signal (LinkedDataFragmentsServer): light-my-request's
// `request()` below treats any such 'error' event as fatal to the whole injected exchange.
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

export async function request(server: Server, path: string, init: FetchLikeInit = {}): Promise<FetchLikeResponse> {
  const response = await inject((req, res) => server.emit('request', req, res), {
    url: path,
    method: init.method,
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

// Query has no index signature; this lets the test tables below use an
// arbitrary 'a' field as a stand-in for "pre-existing data that should survive".
export type TestQuery = Query & { a?: number };
export type QueryParamsTestCase = [string, string, string, TestQuery, TestQuery];

// Generates an `it` block that verifies a router's extractQueryParams behavior
export function extractQueryParams(router: Router, description: string, url: string, intent: string, query: Query, expectedQuery: Query) {
  it(description + ' ' + intent, () => {
    const parsed = parseUrl(url, true);
    const result = router.extractQueryParams({ url: parsed }, query);
    expect(result, 'should not return anything').toBeUndefined();
    expect(query, 'should match the expected query').toEqual(expectedQuery);
  });
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
