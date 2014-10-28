/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    url = require('url'),
    negotiate = require('negotiate'),
    N3Util = require('n3').Util,
    _ = require('lodash');

var MIME_PLAINTEXT = 'text/plain;charset=utf-8';

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  var server = http.createServer(), sockets = 0;
  for (var member in LinkedDataFragmentsServer.prototype)
    server[member] = LinkedDataFragmentsServer.prototype[member];

  // Assign settings
  server._sockets = {};
  server._log = options.log || console.error;
  server._accesslogger = options.accesslogger || _.noop;
  server._routers = options.routers || [];
  server._datasources = options.datasources || {};
  server._prefixes = options.prefixes || {};
  server._writers = [];
  server._deferencePaths = options.dereference || {};
  if (!_.isEmpty(server._deferencePaths))
    server._dereferenceMatcher = new RegExp('^(' + Object.keys(server._deferencePaths)
                                                   .map(escapeForRegExp).join('|') + ')');

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
  server.on('error', function (error) { server._sendError(error); });
  server.on('request', function (request, response) {
    server._accesslogger(request, response);
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
  // Allow cross-origin requests
  response.setHeader('Access-Control-Allow-Origin', '*');

  var match, url = request.url, writerSettings;
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
    response.writeHead(405, { 'Content-Type': MIME_PLAINTEXT });
    response.end('The HTTP method "' + request.method + '" is not allowed; try "GET" instead.');
    return;
  }

  // Try to serve a static asset
  if (match = url.match(/^\/assets\/(.+)|^\/(\w*)\.ico$/))
    if (this._sendAsset(request, response, match[1] || match[2])) return;

  // Try to dereference
  if (match = this._dereferenceMatcher && this._dereferenceMatcher.exec(url))
    return this._dereference(request, response, this._deferencePaths[match[1]]);

  // Serve a fragment, negotiating about its representation
  response.setHeader('Vary', 'Accept');
  if (writerSettings = negotiate.choose(this._writers, request)[0])
    response.setHeader('Content-Type', writerSettings.headerType || MIME_PLAINTEXT),
    this._sendFragment(request, response, writerSettings.writer);
  else
    this._sendError(request, response, new Error('No suitable content type found.'), 406);
};

// Dereferences a URL by showing its subject fragment of a certain dataset
LinkedDataFragmentsServer.prototype._dereference = function (request, response, datasetName) {
  var entity = { protocol: 'http', host: request.headers.host, pathname: request.url };
  entity.query = { subject: url.format(entity) }, entity.pathname = '/' + datasetName;
  entity = url.format(entity);
  response.writeHead(303, { 'Location': entity, 'Content-Type': MIME_PLAINTEXT });
  response.end(entity);
};

// Serves a static asset
LinkedDataFragmentsServer.prototype._sendAsset = function (request, response, assetName) {
  var asset = this._assets[assetName];
  if (asset) {
    response.writeHead(200, {
      'Content-Type': asset.type,
      'Cache-Control': 'public,max-age=1209600', // 14 days
    });
    response.end(asset.contents);
  }
  return !!asset;
};

// Serves a Linked Data Fragment
LinkedDataFragmentsServer.prototype._sendFragment = function (request, response, writer) {
  var fragmentUrl = url.parse(request.url, true), requestParams = { url: fragmentUrl };
  fragmentUrl.protocol = 'http', fragmentUrl.host = request.headers.host;

  // Create the query from the request by calling the fragment routers
  var query = this._routers.reduce(function (query, router) {
    try { router.extractQueryParams(requestParams, query); }
    catch (e) { /* ignore routing errors */ }
    return query;
  }, { features: [] });

  // Execute the query on the data source
  var datasourceSettings = query.features.datasource && this._datasources[query.datasource];
  delete query.features.datasource;
  if (!datasourceSettings || !datasourceSettings.datasource.supportsQuery(query))
    return this._sendNotFound(request, response, writer);

  // Write the query result
  var self = this, queryResult = datasourceSettings.datasource.select(query, onError),
      metadata = this._createFragmentMetadata(request, query, datasourceSettings);
  response.on('error', onError);
  writer.writeFragment(response, queryResult, metadata);
  function onError(error) { self && self._sendError(request, response, error, 500, writer); self = null; }
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
      fragmentUrl = url.format(_.defaults({ search: '', query: _.omit(requestQuery, 'page'), },
                               requestUrl)),
      fragmentPageUrlBase = fragmentUrl + (/\?/.test(fragmentUrl) ? '&' : '?') + 'page=';

  // Generate a textual representation of the pattern
  query.patternString = '{ ' +
    (query.subject              ? '<' + query.subject   + '> ' : '?s ') +
    (query.predicate            ? '<' + query.predicate + '> ' : '?p ') +
    (N3Util.isUri(query.object) ? '<' + query.object    + '> ' : '?o ') + '}';

  return {
    datasource: _.assign(_.omit(datasourceSettings, 'datasource'), {
      url: datasourceUrl + '#dataset',
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
    datasources: this._datasources,
  };
};

// Serves a "not found" error
LinkedDataFragmentsServer.prototype._sendNotFound = function (request, response, writer) {
  var metadata = { url: request.url, prefixes: this._prefixes, datasources: this._datasources };
  response.writeHead(404, { 'Cache-Control': 'public,max-age=3600' });
  writer.writeNotFound(response, metadata);
};

// Serves an application error
LinkedDataFragmentsServer.prototype._sendError = function (request, response, error, status, writer) {
  // If no request or response is available, we cannot recover
  if (!response) {
    error = request, response = request = null;
    this._log('Fatal error, existing process\n', error.stack);
    return process.exit(-1);
  }

  try {
    // Ensure errors are not handled recursively
    if (response._handlingError)
      return this._log(error), response.end();
    response._handlingError = true;

    // Log the error
    this._log(error.stack);

    // If a response was already started, we cannot change it, so close the stream
    if (response.headersSent)
      return response.end();
    // Try to write a proper error response
    if (writer) {
      var metadata = { prefixes: this._prefixes, datasources: this._datasources };
      response.writeHead(status || 500);
      try { writer.writeError(response, error, metadata); }
      catch (error) { response.end(error.message); }
    }
    // Finally, try to write a plaintext error response
    else {
      response.writeHead(status || 500, { 'Content-Type': MIME_PLAINTEXT });
      response.end('Application error: ' + error.message);
    }
  }
  catch (error) { this._log(error.stack); }
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

// Escapes a string for use in a regular expression
function escapeForRegExp(string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

module.exports = LinkedDataFragmentsServer;
