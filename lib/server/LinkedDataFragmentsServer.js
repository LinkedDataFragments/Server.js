/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http');

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  var server = http.createServer();
  for (var member in prototype)
    server[member] = prototype[member];

  // Attach event listeners
  server.on('request', server._handleRequest.bind(server));
  return server;
}

var prototype = LinkedDataFragmentsServer.prototype = {
  // Handles an incoming HTTP request
  _handleRequest: function (request, response) {
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
      response.writeHead(405, { 'Content-Type': 'text/plain' });
      response.end('The HTTP method "' + request.method + '" is not allowed; try "GET" instead.');
      return;
    }
    response.end();
  },
};

module.exports = LinkedDataFragmentsServer;
