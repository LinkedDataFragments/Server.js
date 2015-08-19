/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http'),
    url = require('url'),
    _ = require('lodash'),
    AssetsHandler = require('./handlers/AssetsHandler'),
    DereferenceHandler = require('./handlers/DereferenceHandler'),
    FragmentsHandler = require('./handlers/FragmentsHandler'),
    NotFoundHandler = require('./handlers/NotFoundHandler'),
    Util = require('./Util');

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  var server = http.createServer(), sockets = 0;
  for (var member in LinkedDataFragmentsServer.prototype)
    server[member] = LinkedDataFragmentsServer.prototype[member];

  // Assign settings
  server._sockets = {};
  server._baseUrl = _.mapValues(url.parse(options.baseURL || '/'), function (value, key) {
    return value && !/^(?:href|path|search)$/.test(key) ? value : undefined;
  });
  server._log = options.log || console.error;
  server._accesslogger = options.accesslogger || _.noop;
  server._datasources = options.datasources || {};
  server._assets = new AssetsHandler(options);
  server._dereferencer = new DereferenceHandler(options);
  server._fragments = new FragmentsHandler(options);
  server._notFound = new NotFoundHandler(options);

  // Attach event listeners
  server.on('error', function (error) { server._sendError(error); });
  server.on('request', function (request, response) {
    server._accesslogger(request, response);
    try { server._handleRequest(request, response); }
    catch (error) { server._sendError(request, response, error); }
  });
  server.on('connection', function (socket) {
    var socketId = sockets++;
    server._sockets[socketId] = socket;
    socket.on('close', function () { delete server._sockets[socketId]; });
  });
  return server;
}

// Handles an incoming HTTP request
LinkedDataFragmentsServer.prototype._handleRequest = function (request, response) {
  // Allow cross-origin requests
  response.setHeader('Access-Control-Allow-Origin', '*');

  switch (request.method) {
  // Allow GET requests
  case 'GET':
    break;
  // Don't write a body with HEAD and OPTIONS
  case 'HEAD':
  case 'OPTIONS':
    response.write = function () {};
    response.end = response.end.bind(response, '', '');
    break;
  // Reject all other methods
  default:
    response.writeHead(405, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('The HTTP method "' + request.method + '" is not allowed; try "GET" instead.');
    return;
  }

  // Determine the actual URL by combining the received request URL with the base URL
  request.parsedUrl = _.defaults(_.pick(url.parse(request.url, true), 'path', 'pathname', 'query'),
                                 this._baseUrl, { protocol: 'http', host: request.headers.host });
  // Try to serve a static asset
  if (this._assets.handleRequest(request, response)) return;
  // Try to serve a fragment
  else if (this._fragments.handleRequest(request, response)) return;
  // Try to dereference
  else if (this._dereferencer.handleRequest(request, response)) return;
  // If all else failed, report that the requested resource was not found
  else this._notFound.handleRequest(request, response);
};

// Serves an application error
LinkedDataFragmentsServer.prototype._sendError = function (request, response, error) {
  // If no request or response is available, we cannot recover
  if (!response) {
    error = request, response = request = null;
    this._log('Fatal error, exiting process\n', error.stack);
    return process.exit(-1);
  }

  try {
    // Ensure errors are not handled recursively
    if (response._handlingError)
      return this._log(error), response.end();
    response._handlingError = true;

    // Log the error
    this._log(error.stack);

    // We cannot safely change an already started response, so close the stream
    if (response.headersSent) {
      response.end();
    }
    // Otherwise, try to write a plaintext error response
    else {
      response.writeHead(500, { 'Content-Type': Util.MIME_PLAINTEXT });
      response.end('Application error: ' + error.message);
    }
  }
  catch (error) { this._log(error.stack); }
};

// Stops the server
LinkedDataFragmentsServer.prototype.stop = function () {
  // Close all data sources
  for (var datasourceName in this._datasources) {
    try { this._datasources[datasourceName].datasource.close(); }
    catch (error) { }
  }
  // Don't accept new connections, and close existing ones
  this.close();
  for (var id in this._sockets)
    this._sockets[id].destroy();
};

module.exports = LinkedDataFragmentsServer;
