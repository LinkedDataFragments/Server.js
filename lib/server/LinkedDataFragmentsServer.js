/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    url = require('url');

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  options = options || {};
  var server = http.createServer();
  for (var member in LinkedDataFragmentsServer.prototype)
    server[member] = LinkedDataFragmentsServer.prototype[member];

  // Read assets into memory
  var assetsPath = options.assetsPath || path.join(__dirname, '../../assets/');
  server._assets = fs.readdirSync(assetsPath).reduce(function (assets, filename) {
    return assets[filename.replace(/[.][^.]+$/, '')] = {
      type: mime.lookup(filename),
      contents: fs.readFileSync(path.join(assetsPath, filename)),
    }, assets;
  }, {});

  server._fragmentRouters = options.fragmentRouters || [];
  server._datasources = options.datasources || {};
  server._writers = options.writers || {};

  // Attach event listeners
  server.on('request', server._handleRequest.bind(server));
  return server;
}

// Handles an incoming HTTP request
LinkedDataFragmentsServer.prototype._handleRequest = function (request, response) {
  var match, url = request.url;
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

  // Serve a static asset
  if (match = url.match(/^\/assets\/(.+)|^\/(\w*)\.ico$/))
    this._sendAsset(request, response, match[1] || match[2]);
  // Serve the index page
  if (url === '/')
    response.end();
  // Serve a fragment
  else
    this._sendFragment(request, response);
};

// Serves a static asset
LinkedDataFragmentsServer.prototype._sendAsset = function (request, response, assetName) {
  var asset = this._assets[assetName];
  if (!asset) return this._sendNotFound(request, response);
  response.writeHead(200, {
    'Content-Type': asset.type,
    'Cache-Control': 'public,max-age=1209600', // 14 days
  });
  response.end(asset.contents);
};

// Serves a Linked Data Fragment
LinkedDataFragmentsServer.prototype._sendFragment = function (request, response) {
  // Set up the response writer
  var writer = this._writers['*/*'];

  // Parse the request
  var fragmentUrl = url.parse(request.url, true), requestParams = { url: fragmentUrl };
  fragmentUrl.protocol = 'http', fragmentUrl.host = request.headers.host;

  // Create the query from the request by calling the fragment routers
  var query = this._fragmentRouters.reduce(function (query, fragmentRouter) {
    try { fragmentRouter.extractQueryParams(requestParams, query); }
    catch (e) { /* ignore routing errors */ }
    return query;
  }, { features: [] });

  // Retrieve the correct data source
  var datasourceName = query.datasource || 'index',
      datasource = this._datasources[datasourceName];
  delete query.features.datasource;

  // Execute the query on the data source and write the result
  if (datasource && datasource.supportsQuery(query)) {
    var queryResult = datasource.select(query);
    writer.writeFragment(response, queryResult, { datasource: { name: datasourceName } });
  }
  else {
    this._sendNotFound(request, response);
  }
};

// Serves a "not found" error
LinkedDataFragmentsServer.prototype._sendNotFound = function (request, response) {
  response.writeHead(404, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'public,max-age=3600', // 1 hour
  });
  response.end('The resource with URL "' + request.url + '" was not found.');
};

module.exports = LinkedDataFragmentsServer;
