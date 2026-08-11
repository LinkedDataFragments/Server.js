/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

import * as _ from 'lodash';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as Util from './Util';
import { ErrorController } from './controllers/ErrorController';
import { UrlData } from './UrlData';
import type { Controller } from './controllers/Controller';
import type { ControllerOptions, LdfRequest, LdfResponse } from './types';

interface LinkedDataFragmentsServerOptions extends ControllerOptions {
  ssl?: https.ServerOptions & { keys?: Record<string, unknown> };
  authentication?: { webid?: boolean };
  log?: (...args: unknown[]) => void;
  accesslogger?: (request: LdfRequest, response: LdfResponse) => void;
  controllers?: Controller[];
  response?: { headers?: Record<string, string> };
}

// The augmented server instance actually returned by `LinkedDataFragmentsServer(...)`.
// Modeled on http.Server rather than https.Server: the constructor below assigns either
// one to `server`, and this file only relies on the http.Server-shaped surface (the
// 'request' event, .listen(), etc.), which https.Server duck-types identically despite
// not nominally extending http.Server in Node's own types — hence the net.Server-mediated
// cast for both branches below, rather than a direct one.
export interface LdfHttpServer extends http.Server {
  _sockets: Record<string, import('net').Socket>;
  _log: (...args: unknown[]) => void;
  _accesslogger: (request: LdfRequest, response: LdfResponse) => void;
  _controllers: Controller[];
  _errorController: ErrorController;
  _defaultHeaders: Record<string, string>;
  _processRequest(request: LdfRequest, response: LdfResponse): void;
  _reportError(request: LdfRequest | Error | null | undefined, response?: LdfResponse, error?: Error): void;
  stop(): void;
}

// Methods attached to every server instance created by LinkedDataFragmentsServer().
// `this` is the LdfHttpServer instance at the call site (server._processRequest(...) etc.),
// same as the original prototype methods this replaces — disabled below since ESLint's
// no-invalid-this only recognizes object/class methods as valid `this` contexts, not
// standalone functions, even though the binding is identical either way.
/* eslint-disable no-invalid-this */

// Handles an incoming HTTP request
function _processRequest(this: LdfHttpServer, request: LdfRequest, response: LdfResponse): void {
  // Add default response headers
  for (let header in this._defaultHeaders)
    response.setHeader(header, this._defaultHeaders[header]);

  // Verify an allowed HTTP method was used
  switch (request.method) {
  // Allow GET requests
  case 'GET':
    break;
  // Don't write a body with HEAD and OPTIONS
  case 'HEAD':
  case 'OPTIONS':
    response.write = function (chunk: any, encoding?: any, callback?: any): boolean { return true; };
    response.end = response.end.bind(response, '', '' as BufferEncoding);
    break;
  // Reject all other methods
  default:
    response.writeHead(405, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('The HTTP method "' + (request.method as string) + '" is not allowed; try "GET" instead.');
    return;
  }

  // Try each of the controllers in order
  let self = this, controllerId = 0;
  function nextController(error?: Error) {
    // Error if the previous controller failed
    if (error)
      response.emit('error', error);
    // Error if no controller left
    else if (controllerId >= self._controllers.length)
      response.emit('error', new Error('No controller for ' + String(request.url)));
    // Otherwise, try the next controller
    else {
      let controller = self._controllers[controllerId++], next = _.once(nextController);
      try { controller.handleRequest(request, response, next); }
      catch (error) { next(Util.toError(error)); }
    }
  }
  response.on('error', (error) => { self._reportError(request, response, error); });
  nextController();
}

// Serves an application error
function _reportError(this: LdfHttpServer, request: LdfRequest | Error | null | undefined, response?: LdfResponse, error?: Error): void {
  // If no request or response is available, the server failed outside of a request; don't recover
  if (!response) {
    error = Util.toError(request);
    response = request = undefined;
    this._log('Fatal error, exiting process\n', error.stack);
    return process.exit(-1);
  }

  // Log the error
  this._log(error!.stack);

  // Try to report the error in the response
  try {
    // Ensure errors are not handled recursively, and don't modify an already started response
    if (response.error || response.headersSent) {
      response.end();
      return;
    }
    response.error = error;
    this._errorController.handleRequest(request as LdfRequest, response, _.noop);
  }
  catch (responseError) { this._log(Util.toError(responseError).stack); }
}

// Stops the server
function stop(this: LdfHttpServer): void {
  // Don't accept new connections, and close existing ones
  this.close();
  for (let id in this._sockets)
    this._sockets[id].destroy();

  // Close all controllers
  this._controllers.forEach(function (this: LdfHttpServer, controller: Controller) {
    try { controller.close && controller.close(); }
    catch (error) { this._log(error); }
  }, this);
}
/* eslint-enable no-invalid-this */

// Creates a new LinkedDataFragmentsServer
export interface LinkedDataFragmentsServerFn {
  (options: LinkedDataFragmentsServerOptions): LdfHttpServer;
  new (options: LinkedDataFragmentsServerOptions): LdfHttpServer;
}

export const LinkedDataFragmentsServer = createServer as LinkedDataFragmentsServerFn;

function createServer(options: LinkedDataFragmentsServerOptions): LdfHttpServer {
  // Create the HTTP(S) server
  let server: LdfHttpServer, sockets = 0;
  let urlData = options && options.urlData ? options.urlData : new UrlData();
  switch (urlData.protocol) {
  case 'http':
    server = http.createServer() as import('net').Server as LdfHttpServer;
    break;
  case 'https':
    const ssl = options.ssl || {}, authentication = options.authentication || {};
    // WebID authentication requires a client certificate
    if (authentication.webid)
      ssl.requestCert = ssl.rejectUnauthorized = true;
    server = https.createServer({ ...ssl, ..._.mapValues(ssl.keys, readHttpsOption) }) as import('net').Server as LdfHttpServer;
    break;
  default:
    throw new Error('The configured protocol ' + urlData.protocol + ' is invalid.');
  }

  // Assign settings
  server._sockets = {};
  server._log = options.log || _.noop;
  server._accesslogger = options.accesslogger || _.noop;
  server._controllers = options.controllers || [];
  server._errorController = new ErrorController(options);
  server._defaultHeaders = options.response && options.response.headers || {};
  server._processRequest = _processRequest;
  server._reportError = _reportError;
  server.stop = stop;

  // Attach event listeners
  server.on('error', (error) => { server._reportError(error); });
  server.on('request', (request: LdfRequest, response: LdfResponse) => {
    server._accesslogger(request, response);
    try { server._processRequest(request, response); }
    catch (error) { server._reportError(request, response, Util.toError(error)); }
  });
  server.on('connection', (socket) => {
    let socketId = sockets++;
    server._sockets[socketId] = socket;
    socket.on('close', () => { delete server._sockets[socketId]; });
  });
  return server;
}

// Reads the value of an option for the https module
function readHttpsOption(value: unknown): unknown {
  // Read each value of an array
  if (Array.isArray(value))
    return value.map(readHttpsOption);
  // Certificates and keys can be strings or files
  else if (typeof value === 'string' && fs.existsSync(value))
    return fs.readFileSync(value);
  // Other strings and regular objects are also allowed
  else
    return value;
}
