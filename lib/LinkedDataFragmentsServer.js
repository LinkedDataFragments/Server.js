/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    url = require('url'),
    negotiate = require('negotiate'),
    _ = require('lodash');

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  var server = http.createServer(), sockets = 0;
  for (var member in LinkedDataFragmentsServer.prototype)
    server[member] = LinkedDataFragmentsServer.prototype[member];

  // Assign settings
  server._sockets = {};
  server._log = options.log || console.error;
  server._fragmentRouters = options.fragmentRouters || [];
  server._datasources = options.datasources || {};
  server._prefixes = options.prefixes || {};
  server._writers = [];

  // Prepare writers and their MIME types
  for (var mimeTypes in options.writers) {
    // The object value is a writer, the key is a list of MIME types
    var writer = options.writers[mimeTypes];
    mimeTypes = mimeTypes.split(/[,;]/);
    // Create a settings object for each writer
    mimeTypes.forEach(function (mimeType, index) {
      var isUniversalType = mimeType === '*/*',
          headerType = isUniversalType ? (mimeTypes[index ? 0 : 1] || '') : mimeType,
          isTextualType = /^text\/|\/(?:json|xml)$/.test(headerType);
      server._writers.push({
        type: mimeType,
        writer: writer,
        headerType: isTextualType ? headerType + ';charset=utf-8' : headerType,
        quality: isUniversalType ? 1.0 : 0.8,
      });
    });
  }

  // Read assets into memory
  var assetsPath = options.assetsPath || path.join(__dirname, '../assets/');
  server._assets = fs.readdirSync(assetsPath).reduce(function (assets, filename) {
    var assetType = mime.lookup(filename);
    return assets[filename.replace(/[.][^.]+$/, '')] = {
      type: assetType.indexOf('text/') ? assetType : assetType + ';charset=utf-8',
      contents: fs.readFileSync(path.join(assetsPath, filename)),
    }, assets;
  }, {});

  // Attach event listeners
  server.on('error', server._sendError.bind(server));
  server.on('request', function (request, response) {
    try { server._handleRequest(request, response); }
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
    response.writeHead(405, { 'Content-Type': 'text/plain;charset=utf-8' });
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
  var writerSettings = negotiate.choose(this._writers, request)[0];
  if (!writerSettings)
    return this._sendError(request, response, new Error('No suitable content type found.'), 406);

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
      datasourceSettings = this._datasources[datasourceName];
  delete query.features.datasource;

  // Execute the query on the data source and write the result
  if (datasourceSettings && datasourceSettings.datasource.supportsQuery(query)) {
    var queryResult = datasourceSettings.datasource.select(query),
        metadata = this._createFragmentMetadata(request, query, datasourceSettings);
    writerSettings.headerType && response.setHeader('Content-Type', writerSettings.headerType);
    writerSettings.writer.writeFragment(response, queryResult, metadata);
    response.on('error', this._sendError.bind(this, request, response));
  }
  else {
    this._sendNotFound(request, response);
  }
};

// Creates metadata about the requested fragment
LinkedDataFragmentsServer.prototype._createFragmentMetadata =
  function (request, query, datasourceSettings) {
  // TODO: these URLs should be generated by the routers
  var requestUrl = _.assign(url.parse(request.url, true),
                            { protocol: 'http', host: request.headers.host }),
      requestQuery = requestUrl.query,
      currentPage = parseInt(requestQuery.page, 10) || 1,
      datasourceUrl = url.format(_.omit(requestUrl, 'search', 'query')),
      fragmentUrl = url.format(_.assign(requestUrl, { search: null,
        query: _.omit(requestQuery, 'page'),
      })),
      fragmentPageUrlBase = fragmentUrl + (/\?/.test(fragmentUrl) ? '&' : '?') + 'page=';

  return {
    datasource: _.assign(_.omit(datasourceSettings, 'datasource'), {
      url: datasourceUrl,
      templateUrl: datasourceUrl + '{?subject,predicate,object}',
    }),
    fragment: {
      url: fragmentUrl,
      pageUrl: url.format(requestUrl),
      firstPageUrl: fragmentPageUrlBase + '1',
      nextPageUrl: fragmentPageUrlBase + (currentPage + 1),
      previousPageUrl: currentPage > 1 ? fragmentPageUrlBase + (currentPage - 1) : null,
    },
    query: query,
    prefixes: this._prefixes,
  };
};

// Serves a "not found" error
LinkedDataFragmentsServer.prototype._sendNotFound = function (request, response) {
  response.writeHead(404, {
    'Content-Type': 'text/plain;charset=utf-8',
    'Cache-Control': 'public,max-age=3600', // 1 hour
  });
  response.end('The resource with URL "' + request.url + '" was not found.');
};

// Serves an application error
LinkedDataFragmentsServer.prototype._sendError = function (request, response, error, statusCode) {
  // If no request or response is available, we cannot recover
  if (!response) {
    error = request, response = request = null;
    this._log('Fatal error, existing process\n', error.stack);
    return process.exit(-1);
  }

  // Ensure errors are not handled recursively
  if (request._handlingError) return;
  request._handlingError = true;

  try {
    // Log the error
    this._log(error.stack);

    // If a response was already started, we cannot change it, so close the stream
    if (response.headersSent)
      response.end();
    // Otherwise, write en error response
    else {
      response.writeHead(statusCode || 500, { 'Content-Type': 'text/plain;charset=utf-8', });
      response.end('Application error.');
    }
  }
  catch (error) { try { this._log(error.stack); } catch (error) { } }
};

// Stops the server
LinkedDataFragmentsServer.prototype.stop = function () {
  // Close all data sources
  for (var datasourceName in this._datasources) {
    try { this._datasources[datasourceName].datasource.close(); }
    catch (error) { }
  }
  // Don't accept new connections, and close existing ones
  this.close();
  for (var id in this._sockets)
    this._sockets[id].destroy();
};

module.exports = LinkedDataFragmentsServer;
