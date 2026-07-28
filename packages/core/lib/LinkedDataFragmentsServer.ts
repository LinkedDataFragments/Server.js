/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

import * as _ from 'lodash';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import Util = require('./Util');
import ErrorController = require('./controllers/ErrorController');
import UrlData = require('./UrlData');
import type Controller = require('./controllers/Controller');
import type { ControllerOptions, LdfRequest, LdfResponse } from './types';

interface LinkedDataFragmentsServerOptions extends ControllerOptions {
  ssl?: https.ServerOptions & { keys?: any };
  authentication?: { webid?: boolean };
  log?: (...args: any[]) => void;
  accesslogger?: (request: LdfRequest, response: LdfResponse) => void;
  controllers?: Controller[];
  response?: { headers?: Record<string, string> };
}

// eslint-disable-next-line no-redeclare
namespace LinkedDataFragmentsServer {
  // The augmented http(s).Server instance actually returned by `new LinkedDataFragmentsServer(...)`
  export interface LdfHttpServer extends http.Server {
    _sockets: Record<string, import('net').Socket>;
    _log: (...args: any[]) => void;
    _accesslogger: (request: LdfRequest, response: LdfResponse) => void;
    _controllers: Controller[];
    _errorController: ErrorController;
    _defaultHeaders: Record<string, string>;
    _processRequest(request: LdfRequest, response: LdfResponse): void;
    _reportError(request: LdfRequest | Error | null | undefined, response?: LdfResponse, error?: Error): void;
    stop(): void;
  }
}
type LdfHttpServer = LinkedDataFragmentsServer.LdfHttpServer;

// Creates a new LinkedDataFragmentsServer
//
// NOTE: the methods below are intentionally attached via `.prototype.x = function` rather than
// as class-body methods: class-body methods are non-enumerable, which would break the
// `for (let member in LinkedDataFragmentsServer.prototype)` copy loop the constructor relies on
// to transplant them onto the actual http(s).Server instance it returns.
class LinkedDataFragmentsServer {
  constructor(options: LinkedDataFragmentsServerOptions) {
    // Create the HTTP(S) server
    let server: LdfHttpServer, sockets = 0;
    let urlData = options && options.urlData ? options.urlData : new UrlData();
    switch (urlData.protocol) {
    case 'http':
      server = http.createServer() as unknown as LdfHttpServer;
      break;
    case 'https':
      const ssl = options.ssl || {}, authentication = options.authentication || {};
      // WebID authentication requires a client certificate
      if (authentication.webid)
        ssl.requestCert = ssl.rejectUnauthorized = true;
      server = https.createServer({ ...ssl, ..._.mapValues(ssl.keys, readHttpsOption) }) as unknown as LdfHttpServer;
      break;
    default:
      throw new Error('The configured protocol ' + urlData.protocol + ' is invalid.');
    }

    // Copy over members
    for (let member in LinkedDataFragmentsServer.prototype)
      (server as any)[member] = (LinkedDataFragmentsServer.prototype as any)[member];

    // Assign settings
    server._sockets = {};
    server._log = options.log || _.noop;
    server._accesslogger = options.accesslogger || _.noop;
    server._controllers = options.controllers || [];
    server._errorController = new ErrorController(options);
    server._defaultHeaders = options.response && options.response.headers || {};

    // Attach event listeners
    server.on('error', (error) => { server._reportError(error); });
    server.on('request', (request: LdfRequest, response: LdfResponse) => {
      server._accesslogger(request, response);
      try { server._processRequest(request, response); }
      catch (error) { server._reportError(request, response, error as Error); }
    });
    server.on('connection', (socket) => {
      let socketId = sockets++;
      server._sockets[socketId] = socket;
      socket.on('close', () => { delete server._sockets[socketId]; });
    });
    return server;
  }
}

// Handles an incoming HTTP request
(LinkedDataFragmentsServer.prototype as any)._processRequest = function (this: LdfHttpServer, request: LdfRequest, response: LdfResponse): void {
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
    (response as any).write = function () {};
    response.end = response.end.bind(response, '', '' as BufferEncoding);
    break;
  // Reject all other methods
  default:
    response.writeHead(405, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('The HTTP method "' + request.method + '" is not allowed; try "GET" instead.');
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
      response.emit('error', new Error('No controller for ' + request.url));
    // Otherwise, try the next controller
    else {
      let controller = self._controllers[controllerId++], next = _.once(nextController);
      try { controller.handleRequest(request, response, next); }
      catch (error) { next(error as Error); }
    }
  }
  response.on('error', (error) => { self._reportError(request, response, error); });
  nextController();
};

// Serves an application error
(LinkedDataFragmentsServer.prototype as any)._reportError = function (this: LdfHttpServer, request: LdfRequest | Error | null | undefined, response?: LdfResponse, error?: Error): void {
  // If no request or response is available, the server failed outside of a request; don't recover
  if (!response) {
    error = request as Error, response = request = undefined;
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
  catch (responseError) { this._log((responseError as Error).stack); }
};

// Stops the server
(LinkedDataFragmentsServer.prototype as any).stop = function (this: LdfHttpServer): void {
  // Don't accept new connections, and close existing ones
  this.close();
  for (let id in this._sockets)
    this._sockets[id].destroy();

  // Close all controllers
  this._controllers.forEach(function (this: LdfHttpServer, controller: Controller) {
    try { controller.close && controller.close(); }
    catch (error) { this._log(error); }
  }, this);
};

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

export = LinkedDataFragmentsServer;
