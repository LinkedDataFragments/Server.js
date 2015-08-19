/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var http = require('http'),
    url = require('url'),
    negotiate = require('negotiate'),
    N3Util = require('n3').Util,
    _ = require('lodash'),
    AssetsHandler = require('./handlers/AssetsHandler'),
    DereferenceHandler = require('./handlers/DereferenceHandler'),
    Util = require('./Util');

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP server
  var server = http.createServer(), sockets = 0;
  for (var member in LinkedDataFragmentsServer.prototype)
    server[member] = LinkedDataFragmentsServer.prototype[member];

  // Assign settings
  server._sockets = {};
  server._baseUrl = _.mapValues(url.parse(options.baseURL || '/'), function (value, key) {
    return value && !/^(?:href|path|search)$/.test(key) ? value : undefined;
  });
  server._log = options.log || console.error;
  server._accesslogger = options.accesslogger || _.noop;
  server._routers = options.routers || [];
  server._datasources = options.datasources || {};
  server._prefixes = options.prefixes || {};
  server._writers = [];
  server._assets = new AssetsHandler(options);
  server._dereferencer = new DereferenceHandler(options);

  // Prepare writers and their MIME types
  for (var mimeTypes in options.writers) {
    // The object value is a writer, the key is a list of MIME types
    var writer = options.writers[mimeTypes];
    mimeTypes = mimeTypes.split(/[,;]/);
    // Create a settings object for each writer
    mimeTypes.forEach(function (mimeType, index) {
      var isUniversalType = mimeType === '*/*',
          specificType = isUniversalType ? (mimeTypes[index ? 0 : 1] || 'text/plain') : mimeType,
          isTextualType = /^text\/|\/(?:json|xml)$/.test(specificType);
      server._writers.push({
        writer: writer,
        type: mimeType, // for content negotiation
        mimeType: isTextualType ? specificType + ';charset=utf-8' : specificType, // for response
        quality: isUniversalType ? 1.0 : 0.8,
      });
    });
  }

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

  // Determine the actual URL by combining the received request URL with the base URL
  request.parsedUrl = _.defaults(_.pick(url.parse(request.url, true), 'path', 'pathname', 'query'),
                                 this._baseUrl, { protocol: 'http', host: request.headers.host });
  // Try to serve a static asset
  if (this._assets.handleRequest(request, response)) return;
  // In all other cases, the response requires content negotiation
  response.setHeader('Vary', 'Accept');
  var writerSettings = negotiate.choose(this._writers, request)[0];
  if (!writerSettings)
    return this._sendError(request, response, new Error('No suitable content type found.'), 406);

  // Try to serve a fragment
  if (this._sendFragment(request, response, writerSettings)) return;
  // Try to dereference
  else if (this._dereferencer.handleRequest(request, response)) return;
  // If all else failed, report that the requested resource was not found
  else this._sendNotFound(request, response, writerSettings);
};

// Serves a Linked Data Fragment
LinkedDataFragmentsServer.prototype._sendFragment = function (request, response, writerSettings) {
  // Create the query from the request by calling the fragment routers
  var requestParams = { url: request.parsedUrl },
      query = this._routers.reduce(function (query, router) {
    try { router.extractQueryParams(requestParams, query); }
    catch (e) { /* ignore routing errors */ }
    return query;
  }, { features: [] });

  // Execute the query on the data source
  var datasourceSettings = query.features.datasource && this._datasources[query.datasource];
  delete query.features.datasource;
  if (!datasourceSettings || !datasourceSettings.datasource.supportsQuery(query))
    return false;

  // Write the query result
  var self = this, queryResult = datasourceSettings.datasource.select(query, onError),
      metadata = this._createFragmentMetadata(request, query, datasourceSettings);
  response.on('error', onError);
  response.setHeader('Content-Type', writerSettings.mimeType);
  writerSettings.writer.writeFragment(response, queryResult, metadata);
  function onError(error) {
    self && self._sendError(request, response, error, 500, writerSettings.writer), self = null;
  }
  return true;
};

// Creates metadata about the requested fragment
LinkedDataFragmentsServer.prototype._createFragmentMetadata =
  function (request, query, datasourceSettings) {
  // TODO: these URLs should be generated by the routers
  var requestUrl = request.parsedUrl,
      paramsNoPage = _.omit(requestUrl.query, 'page'),
      currentPage = parseInt(requestUrl.query.page, 10) || 1,
      datasourceUrl = url.format(_.omit(requestUrl, 'search', 'query')),
      fragmentUrl = url.format(_.defaults({ search: '', query: paramsNoPage }, requestUrl)),
      fragmentPageUrlBase = fragmentUrl + (/\?/.test(fragmentUrl) ? '&' : '?') + 'page=',
      indexUrl = url.format(_.omit(requestUrl, 'search', 'query', 'pathname')) + '/';

  // Generate a textual representation of the pattern
  query.patternString = '{ ' +
    (query.subject              ? '<' + query.subject   + '> ' : '?s ') +
    (query.predicate            ? '<' + query.predicate + '> ' : '?p ') +
    (N3Util.isIRI(query.object) ? '<' + query.object    + '> ' : (query.object || '?o')) + ' }';

  return {
    datasource: _.assign(_.omit(datasourceSettings, 'datasource'), {
      index: indexUrl + '#dataset',
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
LinkedDataFragmentsServer.prototype._sendNotFound = function (request, response, writerSettings) {
  var metadata = { url: request.url, prefixes: this._prefixes, datasources: this._datasources };
  response.writeHead(404, { 'Cache-Control': 'public,max-age=3600',
                            'Content-Type': writerSettings.mimeType });
  writerSettings.writer.writeNotFound(response, metadata);
  return true;
};

// Serves an application error
LinkedDataFragmentsServer.prototype._sendError = function (request, response, error, status, writerSettings) {
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
    if (writerSettings && writerSettings.writer) {
      var metadata = { prefixes: this._prefixes, datasources: this._datasources };
      response.writeHead(status || 500, { 'Content-Type': writerSettings.mimeType || Util.MIME_PLAINTEXT });
      writerSettings.writer.writeError(response, error, metadata);
    }
    // Finally, try to write a plaintext error response
    else {
      response.writeHead(status || 500, { 'Content-Type': Util.MIME_PLAINTEXT });
      response.end('Application error: ' + error.message);
    }
  }
  catch (error) { this._log(error.stack); }
  return true;
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
