/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime');

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  options = options || {};
  var server = http.createServer();
  for (var member in prototype)
    server[member] = prototype[member];

  // Read assets into memory
  var assetsPath = options.assetsPath || path.join(__dirname, '../../assets/');
  server._assets = fs.readdirSync(assetsPath).reduce(function (assets, filename) {
    return assets[filename.replace(/[.][^.]+$/, '')] = {
      type: mime.lookup(filename),
      contents: fs.readFileSync(path.join(assetsPath, filename)),
    }, assets;
  }, {});

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

    var match, url = request.url;
    if (match = url.match(/^\/assets\/(.+)|^\/(.*)\.ico$/))
      this._sendAsset(request, response, match[1] || match[2]);
    else
      response.end();
  },

  // Serves a static asset
  _sendAsset: function (request, response, assetName) {
    var asset = this._assets[assetName];
    response.writeHead(200, { 'Content-Type': asset.type });
    response.end(asset.contents);
  },
};

module.exports = LinkedDataFragmentsServer;
