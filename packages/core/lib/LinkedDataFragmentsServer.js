/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

let _ = require('lodash'),
    fs = require('fs'),
    Util = require('./Util'),
    ErrorController = require('./controllers/ErrorController'),
    UrlData = require('./UrlData');

// Creates a new LinkedDataFragmentsServer
class LinkedDataFragmentsServer {
  constructor(options) {
    // Create the HTTP(S) server
    let server, sockets = 0;
    let urlData = options && options.urlData ? options.urlData : new UrlData();
    switch (urlData.protocol) {
    case 'http':
      server = require('http').createServer();
      break;
    case 'https':
      const ssl = options.ssl || {}, authentication = options.authentication || {};
      // WebID authentication requires a client certificate
      if (authentication.webid)
        ssl.requestCert = ssl.rejectUnauthorized = true;
      server = require('https').createServer({ ...ssl, ..._.mapValues(ssl.keys, readHttpsOption) });
      break;
    default:
      throw new Error('The configured protocol ' + urlData.protocol + ' is invalid.');
    }

    // Copy over members
    for (let member in LinkedDataFragmentsServer.prototype)
      server[member] = LinkedDataFragmentsServer.prototype[member];

    // Assign settings
    server._sockets = {};
    server._log = options.log || _.noop;
    server._accesslogger = options.accesslogger || _.noop;
    server._controllers = options.controllers || [];
    server._errorController = new ErrorController(options);
    server._defaultHeaders = options.response && options.response.headers || {};

    // Attach event listeners
    server.on('error', (error) => { server._reportError(error); });
    server.on('request', (request, response) => {
      server._accesslogger(request, response);
      try { server._processRequest(request, response); }
      catch (error) { server._reportError(request, response, error); }
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
LinkedDataFragmentsServer.prototype._processRequest = function (request, response) {
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
  let self = this, controllerId = 0;
  function nextController(error) {
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
      catch (error) { next(error); }
    }
  }
  response.on('error', (error) => { self._reportError(request, response, error); });
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
  for (let id in this._sockets)
    this._sockets[id].destroy();

  // Close all controllers
  this._controllers.forEach(function (controller) {
    try { controller.close && controller.close(); }
    catch (error) { this._log(error); }
  }, this);
};

// Reads the value of an option for the https module
function readHttpsOption(value) {
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

module.exports = LinkedDataFragmentsServer;
