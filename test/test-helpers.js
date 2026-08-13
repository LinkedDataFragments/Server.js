/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
import { it, expect } from 'vitest';
import { parse as parseUrl } from 'url';
import { Readable, Writable } from 'stream';

// Generates an `it` block that verifies a router's extractQueryParams behavior
export function extractQueryParams(router, description, url, intent, query, expectedQuery) {
  it(description + ' ' + intent, () => {
    const result = router.extractQueryParams({ url: parseUrl(url, true) }, query);
    expect(result).toBeUndefined();
    expect(query).toEqual(expectedQuery);
  });
}

// Creates a dummy HTTP response
export function createHttpResponse(contents, contentType) {
  const response = new Readable();
  response._read = () => {};
  response.statusCode = 200;
  response.headers = { 'content-type': contentType };
  response.abort = () => { response.aborted = true; };
  setImmediate(() => { response.push(contents); response.push(null); });
  return response;
}

// Creates an in-memory stream
export function createStreamCapture() {
  const stream = new Writable({ objectMode: true });
  stream.buffer = '';
  stream._write = (chunk, encoding, callback) => {
    stream.buffer += chunk;
    callback();
  };
  return stream;
}

// Counts the elements in a stream and resolves once it ends
export function streamLength(stream) {
  return new Promise((resolve) => {
    let length = 0;
    stream.on('data', () => { length++; });
    stream.on('end', () => resolve(length));
  });
}
