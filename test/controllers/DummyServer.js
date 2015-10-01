var http = require('http');

/* Dummy server that emulates LinkedDataFragmentsServer */
function DummyServer(controller) {
  var server = http.createServer();
  server.on('request', function (request, response) {
    // End the request if the controller did not handle the request
    controller.next = sinon.spy(function () { response.end(); });
    controller.result = controller.handleRequest(request, response, controller.next);
  });
  return server;
}

module.exports = DummyServer;
