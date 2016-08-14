/*! @license MIT ©2014-2016 Ruben Verborgh - Ghent University / iMinds */
/* LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http'),
    _ = require('lodash'),
    Util = require('./Util'),
    ErrorController = require('./controllers/ErrorController');

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  var server = http.createServer(), sockets = 0;
  for (var member in LinkedDataFragmentsServer.prototype)
    server[member] = LinkedDataFragmentsServer.prototype[member];

  // Assign settings
  server._sockets = {};
  server._log = options.log || _.noop;
  server._accesslogger = options.accesslogger || _.noop;
  server._controllers = options.controllers || [];
  server._errorController = new ErrorController(options);
  server._defaultHeaders = options.response && options.response.headers || {};

  // Attach event listeners
  server.on('error', function (error) { server._reportError(error); });
  server.on('request', function (request, response) {
    server._accesslogger(request, response);
    try { server._processRequest(request, response); }
    catch (error) { server._reportError(request, response, error); }
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
  // Add default response headers
  for (var header in this._defaultHeaders)
    response.setHeader(header, this._defaultHeaders[header]);

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
  function nextController(error) {
    // Error if the previous controller failed
    if (error)
      response.emit('error', error);
    // Error if no controller left
    else if (controllerId >= self._controllers.length)
      response.emit('error', new Error('No controller for ' + request.url));
    // Otherwise, try the next controller
    else {
      var controller = self._controllers[controllerId++], next = _.once(nextController);
      try { controller.handleRequest(request, response, next); }
      catch (error) { next(error); }
    }
  }
  response.on('error', function (error) { self._reportError(request, response, error); });
  nextController();
};

// Serves an application error
LinkedDataFragmentsServer.prototype._reportError = function (request, response, error) {
  // If no request or response is available, the server failed outside of a request; don't recover
  if (!response) {
    error = request, response = request = null;
    this._log('Fatal error, exiting process\n', error.stack);
    return process.exit(-1);
  }

  // Log the error
  this._log(error.stack);

  // Try to report the error in the response
  try {
    // Ensure errors are not handled recursively, and don't modify an already started response
    if (response.error || response.headersSent)
      return response.end();
    response.error = error;
    this._errorController.handleRequest(request, response, _.noop);
  }
  catch (responseError) { this._log(responseError.stack); }
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
