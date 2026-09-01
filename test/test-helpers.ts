/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
import { it, expect } from 'vitest';
import { parse as parseUrl } from 'url';
import { Readable } from 'stream';
import { IncomingMessage, ServerResponse, type Server } from 'http';
import { Socket } from 'net';
import { EventEmitter, once } from 'events';
import type { Query, RouterRequest } from '../packages/core/lib/types';

// Starts the given server on an ephemeral port and resolves with its base URL
export async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('Expected the server to report a network address');
  return `http://localhost:${address.port}`;
}

// A router as accepted by extractQueryParams; DatasourceRouter and PageRouter both satisfy this
interface QueryParamRouter {
  extractQueryParams(request: RouterRequest, query: Query): void;
}

// Generates an `it` block that verifies a router's extractQueryParams behavior
export function extractQueryParams(router: QueryParamRouter, description: string, url: string, intent: string, query: Query, expectedQuery: Query) {
  it(description + ' ' + intent, () => {
    const parsed = parseUrl(url, true);
    const result = router.extractQueryParams({ url: { pathname: parsed.pathname ?? undefined, query: parsed.query } }, query);
    expect(result, 'should not return anything').toBeUndefined();
    expect(query, 'should match the expected query').toEqual(expectedQuery);
  });
}

// A dummy HTTP response, as returned by createHttpResponse
class HttpResponse extends Readable {
  statusCode = 200;
  headers: Record<string, string>;
  aborted = false;

  constructor(contentType: string) {
    super();
    this.headers = { 'content-type': contentType };
  }

  override _read(): void {}

  abort(): void {
    this.aborted = true;
  }
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
