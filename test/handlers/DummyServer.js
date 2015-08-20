var http = require('http');

/* Dummy server that emulates LinkedDataFragmentsServer */
function DummyServer(handler) {
  var server = http.createServer();
  server.on('request', function (request, response) {
    // Execute the handler and store its result
    handler.result = handler.handleRequest(request, response);
    // End the request if the handler did not handle the request
    if (!handler.result) response.end();
  });
  return server;
}

module.exports = DummyServer;
