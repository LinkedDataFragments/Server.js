/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http'),
    _ = require('lodash'),
    Util = require('./Util');

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  var server = http.createServer(), sockets = 0;
  for (var member in LinkedDataFragmentsServer.prototype)
    server[member] = LinkedDataFragmentsServer.prototype[member];

  // Assign settings
  server._sockets = {};
  server._log = options.log || console.error;
  server._accesslogger = options.accesslogger || _.noop;
  server._controllers = options.controllers || [];

  // Attach event listeners
  server.on('error', function (error) { server._sendError(error); });
  server.on('request', function (request, response) {
    server._accesslogger(request, response);
    try { server._processRequest(request, response); }
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
LinkedDataFragmentsServer.prototype._processRequest = function (request, response) {
  // Allow cross-origin requests
  response.setHeader('Access-Control-Allow-Origin', '*');

  // Verify an allowed HTTP method was used
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

  // Try each of the controllers in order
  var self = this, controllerId = 0;
  (function nextController(error) {
    // Error if no controller left
    if (controllerId >= self._controllers.length && !error)
      error = new Error('No controller for ' + request.url);
    // Report when an error occurred
    if (error)
      return self._sendError(request, response, error);
    // If all is fine, try the next controller
    var controller = self._controllers[controllerId++], next = _.once(nextController);
    try { controller.handleRequest(request, response, next); }
    catch (error) { next(error); }
  })();
};

// Serves an application error
LinkedDataFragmentsServer.prototype._sendError = function (request, response, error) {
  // If no request or response is available, we cannot recover
  if (!response) {
    error = request, response = request = null;
    this._log('Fatal error, exiting process\n', error.stack);
    return process.exit(-1);
  }

  // Try to report the error in the response, and log it locally
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
  // Don't accept new connections, and close existing ones
  this.close();
  for (var id in this._sockets)
    this._sockets[id].destroy();

  // Close all controllers
  this._controllers.forEach(function (controller) {
    try { controller.close && controller.close(); }
    catch (error) { this._log(error); }
  }, this);
};

module.exports = LinkedDataFragmentsServer;
