var http = require('http'),
    url = require('url'),
    _ = require('lodash');

/* Dummy server that emulates LinkedDataFragmentsServer */
function DummyServer(handler, options) {
  var server = http.createServer(),
      baseUrl = _.mapValues(url.parse(options && options.baseURL || '/'), function (value, key) {
                  return value && !/^(?:href|path|search)$/.test(key) ? value : undefined;
                });
  server.on('request', function (request, response) {
    // pre-set parsed request URL
    request.parsedUrl = _.defaults(
      _.pick(url.parse(request.url, true), 'path', 'pathname', 'query'),
      baseUrl, { protocol: 'http', host: request.headers.host });
    // execute the handler and store its result
    handler.result = handler.handleRequest(request, response);
    // end the request if the handler did not handle the request
    if(!handler.result) response.end();
  });
  return server;
}

module.exports = DummyServer;
