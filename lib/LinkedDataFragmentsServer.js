/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    url = require('url'),
    negotiate = require('negotiate'),
    N3 = require('n3'),
    N3Util = N3.Util,
    _ = require('lodash');

var MIME_PLAINTEXT = 'text/plain;charset=utf-8';

// Creates a new LinkedDataFragmentsServer
function LinkedDataFragmentsServer(options) {
  // Create the HTTP(S) server
  var server, sockets = 0,
    protocol = options.protocol ? options.protocol : 'http';
  switch (protocol) {
    case 'https':
      var ssl = options.ssl || {};
      _.defaults(ssl, {
        requestCert: true,
        rejectUnauthorized: true
      },
      _.mapValues(_.defaults(ssl.keys || {}, {
        key: path.join(__dirname, '../localhost.key'),
        cert: path.join(__dirname, '../localhost.crt')
      }), function (v) { return _.isArray(v) ? _.map(v, function(w) { return fs.readFileSync(w, 'ascii'); }) :  fs.readFileSync(v, 'ascii'); }));

      server = require('https').createServer(ssl);
      break;
    default:
      server = require('http').createServer();
  }
  server._protocol = protocol;

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
  server._assetsPath = options.assetsPath || '/assets/',
  server._assetsMatcher = new RegExp('^' + toRegExp(server._assetsPath) + '(.+)|^/(\\w*)\\.ico$');
  server._deferencePaths = options.dereference || {};
  if (!_.isEmpty(server._deferencePaths))
    server._dereferenceMatcher = new RegExp('^(' + Object.keys(server._deferencePaths)
                                                   .map(toRegExp).join('|') + ')');

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

  // Read assets into memory
  var assetsFolder = options.assetsFolder || path.join(__dirname, '../assets/');
  server._assets = fs.readdirSync(assetsFolder).reduce(function (assets, filename) {
    var assetType = mime.lookup(filename);
    return assets[filename.replace(/[.][^.]+$/, '')] = {
      type: assetType.indexOf('text/') ? assetType : assetType + ';charset=utf-8',
      contents: fs.readFileSync(path.join(assetsFolder, filename)),
    }, assets;
  }, {});

  // Attach event listeners
  server.on('error', function (error) { server._sendError(error); });
  server.on('request', function (request, response) {
    server._accesslogger(request, response);
    try { server._authenticate(request, response, function (request, response) {
      server._handleRequest(request, response);
      });
    }
    catch (error) { server._sendError(request, response, error); }
  });
  server.on('connection', function (socket) {
    var socketId = sockets++;
    server._sockets[socketId] = socket;
    socket.on('close', function () { delete server._sockets[socketId]; });
  });
  return server;
}

LinkedDataFragmentsServer.prototype._authenticate = function (request, response, callback) {
    // Get WebID from certificate
    if (this._protocol !== 'https') {
      callback(request, response);
      return;
    }

    var self = this,
        certificate = request.connection.getPeerCertificate();

    if (certificate.subject && certificate.subject.subjectAltName) {
      var webID = certificate.subject.subjectAltName.replace('uniformResourceIdentifier:', '');

      this._verifyWebID(webID, certificate.modulus, parseInt(certificate.exponent), function (verified) {
        console.log("WebID verified: ", verified);
        if (verified)
          callback(request, response);
        else
          self._sendForbidden(request, response);
      });
    } else self._sendForbidden(request, response);
};

// Verify webID
LinkedDataFragmentsServer.prototype._verifyWebID = function (webID, modulus, exponent, callback) {
  //request & parse
  var parser = N3.Parser(),
      CERT_NS = 'http://www.w3.org/ns/auth/cert#',
      candidates = {}, verified = false;

  parser.parse(processTriple);

  function processTriple(error, triple, prefixes) {
    if (error)
      console.error('Cannot parse WebID: ' + error);
    else if (triple) {
      switch (triple.predicate) {
        case CERT_NS + 'modulus':
          var webidModulus = N3Util.getLiteralValue(triple.object);
          // Apply parsing method by nodejs
          webidModulus = webidModulus.slice(webidModulus.indexOf('00:') === 0 ? 3 : 0).replace(/:/g, '').toUpperCase();

          if (modulus === webidModulus) {
            console.log('WebID modulus verified');
            if (candidates[triple.subject] && candidates[triple.subject] === exponent)
              verified = true;
            else
              candidates[triple.subject] = webidModulus;
          } else console.log('WebID modulus mismatch: %s (webid) <> %s (cert)', webidModulus, modulus);
          break;
        case CERT_NS + 'exponent':
          var webidExponent = parseInt(N3Util.getLiteralValue(triple.object));

          if (webidExponent === exponent) {
            console.log('WebID exponent verified');
            if (candidates[triple.subject] && candidates[triple.subject] === modulus)
              verified = true;
            else
              candidates[triple.subject] = webidExponent;
          } else console.log('WebID exponent mismatch: %s (webid) <> %s (cert)', webidExponent, exponent);
          break;
      }
    } else callback(verified);
  }

  var req = require('http').request(webID, function(res) {
    res.setEncoding('utf8');

    res.on('data', parser.addChunk);
    res.on('end', parser.end);
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
    callback(false);
  });

  req.end();
};

// Serves a Forbidden error
LinkedDataFragmentsServer.prototype._sendForbidden = function (request, response) {
  response.writeHead(401, {'Content-Type': 'text/plain' });
  response.end('WebID not verified');
  return true;
};


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
    response.writeHead(405, { 'Content-Type': MIME_PLAINTEXT });
    response.end('The HTTP method "' + request.method + '" is not allowed; try "GET" instead.');
    return;
  }

  // Determine the actual URL by combining the received request URL with the base URL
  request.parsedUrl = _.defaults(_.pick(url.parse(request.url, true), 'path', 'pathname', 'query'),
                                 this._baseUrl, { protocol: this._protocol || 'http', host: request.headers.host });
  // Try to serve a static asset
  if (this._sendAsset(request, response)) return;
  // In all other cases, the response requires content negotiation
  response.setHeader('Vary', 'Accept');
  var writerSettings = negotiate.choose(this._writers, request)[0];
  if (!writerSettings)
    return this._sendError(request, response, new Error('No suitable content type found.'), 406);

  // Try to serve a fragment
  if (this._sendFragment(request, response, writerSettings)) return;
  // Try to dereference
  else if (this._dereference(request, response)) return;
  // If all else failed, report that the requested resource was not found
  else this._sendNotFound(request, response, writerSettings);
};

// Dereferences a URL by showing its subject fragment of a certain data source
LinkedDataFragmentsServer.prototype._dereference = function (request, response) {
  var match = this._dereferenceMatcher && this._dereferenceMatcher.exec(request.url), datasource;
  if (datasource = match && this._deferencePaths[match[1]]) {
    var entity = url.format(_.defaults({
      pathname: '/' + datasource,
      query: { subject: url.format(request.parsedUrl) },
    }, request.parsedUrl));
    response.writeHead(303, { 'Location': entity, 'Content-Type': MIME_PLAINTEXT });
    response.end(entity);
  }
  return !!datasource;
};

// Serves a static asset
LinkedDataFragmentsServer.prototype._sendAsset = function (request, response, assetName) {
  var assetMatch = request.url.match(this._assetsMatcher), asset;
  if (asset = assetMatch && this._assets[assetMatch[1] || assetMatch[2]]) {
    response.writeHead(200, {
      'Content-Type': asset.type,
      'Cache-Control': 'public,max-age=1209600', // 14 days
    });
    response.end(asset.contents);
  }
  return !!asset;
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
      response.writeHead(status || 500, { 'Content-Type': writerSettings.mimeType || MIME_PLAINTEXT });
      writerSettings.writer.writeError(response, error, metadata);
    }
    // Finally, try to write a plaintext error response
    else {
      response.writeHead(status || 500, { 'Content-Type': MIME_PLAINTEXT });
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

// Escapes a string for use in a regular expression
function toRegExp(string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

module.exports = LinkedDataFragmentsServer;
