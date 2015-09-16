var http = require('http');

/* Dummy server that emulates LinkedDataFragmentsServer */
function DummyServer(controller) {
  var server = http.createServer();
  server.on('request', function (request, response) {
    // Execute the controller and store its result
    controller.result = controller.handleRequest(request, response);
    // End the request if the controller did not handle the request
    if (!controller.result) response.end();
  });
  return server;
}

module.exports = DummyServer;
