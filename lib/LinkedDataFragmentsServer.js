/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var path = require('path'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    _ = require('lodash'),
    N3Util = require('n3').Util;

var fragmentWriters = {
  'text/html': require('./HtmlFragmentWriter'),
  'text/turtle': require('./TurtleFragmentWriter'),
  'application/json': require('./JsonLdFragmentWriter'),
  'application/ld+json': require('./JsonLdFragmentWriter'),
};

var assetsFolder = path.join(__dirname, '../views/');

// Creates a new LinkedDataFragmentsServer for the specified data sources (key/value object)
function LinkedDataFragmentsServer(baseURL, datasources, prefixes) {
  // Create the HTTP server
  var server = http.createServer(), sockets = 0;
  for (var member in prototype)
    server[member] = prototype[member];
  server._datasources = datasources || [];
  server._prefixes = prefixes || {};
  server._sockets = {};

  // Attach event listeners
  server.on('request', server.onRequest.bind(server));
  server.on('error', server.respondWithError.bind(server));
  server.on('connection', function (socket) {
    var sockedId = sockets++;
    server._sockets[sockedId] = socket;
    socket.on('close', function () { delete server._sockets[sockedId]; });
  });
  return server;
}

var prototype = LinkedDataFragmentsServer.prototype = {
  // Handlers and their corresponding URL patterns
  _routes: {
    respondWithFragment: /^\/([\-a-z_]*)$/i,
    sendStyle: '/styles/([a-z]+)',
    sendImage: '/images/([a-z]+)',
    sendIcon: '/([a-z]+).ico',
  },

  // Handles an incoming HTTP request
  onRequest: function (req, res) {
    switch (req.method) {
      case "GET":
        break;
      // In case of HEAD and OPTIONS, don't write a body
      case "HEAD":
      case "OPTIONS":
        res.write = function () {};
        res.end = res.end.bind(res, '', '');
        break;
      // Only accept read-only methods
      default:
        return res.writeHead(405), res.end();
    }

    // Parse URL and redirect to the canonical URL if necessary
    var urlParts = url.parse(req.url, true);
    if (req.url !== urlParts.path)
      return this._redirect(req, res, urlParts.path);
    req.query = urlParts.query;

    // Set HTTP headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Vary', 'Accept');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Powered-By', 'Linked Data Fragments Server');

    // Execute the correct action
    for (var action in this._routes) {
      var path = this._routes[action], match = urlParts.pathname.match(path);
      if (match) {
        req.params = match.splice(1);
        try { return this[action](req, res); }
        catch (error) { return this.respondWithError(req, res, error); }
      }
    }

    // If no action found, send 404
    this.respondNotFound(req, res);
  },

  // Shows results of a data source query
  respondWithFragment: function (req, res) {
    // Find the corresponding data source
    var datasourceName = req.params[0] || 'index',
        datasource = this._datasources[datasourceName];
    if (!datasource)
      return this.respondNotFound(req, res);

    // Parse the query
    var query = req.query,
        pattern = { subject: parseEntity(query.subject, this._prefixes),
                    predicate: parseEntity(query.predicate, this._prefixes),
                    object: parseEntity(query.object, this._prefixes) };

    // Create the output writer
    var self = this, host = req.headers.host,
        prefixes = _.extend(_.clone(this._prefixes), { '': formatURL(host, '/') }),
        writer = this._createFragmentWriter(req, res, { query: query,
          dataset: datasourceName, datasetURL: formatURL(host, datasourceName),
          pattern: pattern, fragmentURL: formatURL(host, datasourceName, query),
          prefixes: prefixes,
        }),
        metadataWritten = false, triplesEnded = false;

    // Writes a triple to the output
    function writeTriple(triple) {
      if (!res.headersSent)
        res.writeHead(200);
      writer.writeTriple(triple);
    }

    // Writes metadata to the output
    function writeMetadata(totalCount) {
      if (!metadataWritten) {
        if (!res.headersSent)
          res.writeHead(totalCount > 0 ? 200 : 404);
        writer.writeMetadata(totalCount);
        metadataWritten = true;
        triplesEnded && end();
      }
    }

    // Ends the output
    function end(error) {
      triplesEnded = true;
      if (error) {
        self.respondWithError(req, res, error);
      }
      else {
        if (metadataWritten)
          writer.end(function (error) { error && self.respondWithError(req, res, error); });
        else
          setTimeout(function () { writeMetadata(Math.pow(2, 32)); }, 5000);
      }
    }

    // Send the results from the datasource to the output
    datasource.query(pattern, writeTriple, writeMetadata, end);
  },

  // Sends a stylesheet
  sendStyle: function (req, res) {
    this.sendFile(['styles', req.params[0] + '.css'], 'text/css; charset=utf-8', res);
  },

  // Sends an image
  sendImage: function (req, res) {
    this.sendFile(['images', req.params[0] + '.svg'], 'image/svg+xml', res);
  },

  // Sends an icon
  sendIcon: function (req, res) {
    this.sendFile([req.params[0] + '.ico'], 'image/x-icon', res);
  },

  // Sends a file
  sendFile: function (pathParts, mimeType, res) {
    var fileName = path.join.apply(path, [assetsFolder].concat(pathParts));
    var fileStream = fs.createReadStream(fileName);
    fileStream.on('error', function () {
      try { res.writeHead(404); }
      finally { res.end(); }
    });
    res.setHeader('Content-Type', mimeType);
    fileStream.pipe(res);
  },

  // Responds to request for an unknown URL
  respondNotFound: function (req, res) {
    var datasets = _.mapValues(this._datasources, function (name, key) {
          return formatURL(req.headers.host, key);
        }),
        options = { url: req.url, datasets: datasets },
        writer = this._createFragmentWriter(req, res, options);
    res.writeHead(404);
    writer.writeNotFound();
    writer.end();
  },

  // Responds to an application error
  respondWithError: function (req, res, error) {
    // Ensure errors are not handled recursively
    if (req._handlingError)
      throw new Error('Already handling an error.');
    req._handlingError = true;
    // Try to render error response
    if (!res.headersSent) {
      var writer = this._createFragmentWriter(req, res, { error: error });
      res.writeHead(500);
      writer.writeError();
      writer.end();
    }
    // Try closing the response stream
    else {
      try { res.end(); }
      catch (endError) {}
    }
    // Log the error
    console.error(error.stack);
  },

  // Redirects the response
  _redirect: function (req, res, location) {
    res.writeHead(301, { location: location });
    res.end('Available at ' + location + '\n');
  },

  // Creates a fragment writer with the correct content type
  _createFragmentWriter: function (req, res, options) {
    var defaults = { prefixes: this._prefixes, rootUrl: formatURL(req.headers.host, '/') },
        contentType = this._negotiate(req, res, fragmentWriters),
        Writer = fragmentWriters[contentType],
        writer = new Writer(res, _.defaults(options, defaults));
    res.setHeader('Content-Type', contentType + ';charset=utf-8');
    return writer;
  },

  // Picks the content type of the options that best fits the client's preferences
  _negotiate: function (req, res, options) {
    // Collect the allowed types
    var allowedTypes = { '*/*': true };
    for (var type in options)
      allowedTypes[type] = true;

    // Parse the Accept header
    var acceptHeader = req.headers.accept || '*/*',
        accepts = acceptHeader.split(',').map(function (optionString) {
          var option = {}, settings = optionString.split(';'), match;
          // Parse key-value settings for each option
          for (var i = 1; i < settings.length; i++)
            if (match = settings[i].match(/^([^=]+)=(.+)$/))
              option[match[1]] = match[2];
          option.type = settings[0];
          return option;
        })
        // Keep only options that are acceptable (= supported and quality > 0)
        .filter(function (option) {
          if (option.type in allowedTypes) {
            if ('q' in option && /^\d+(?:\.\d+)?$/.test(option.q))
              option.q = Math.min(Math.max(parseFloat(option.q), 0.0), 1.0);
            else
              option.q = 1.0;
            if (option.q > 0.0)
              return true;
            delete allowedTypes[option.type];
          }
        })
        // Sort by descending quality values
        .sort(function (a, b) { return b.q - a.q; }),
        bestType = accepts.length ? accepts[0].type : (('*/*' in allowedTypes) && '*/*');

    // Return the best type
    if (bestType in options)
      return bestType;
    // Return the best remaining option if any type is allowed
    else if (bestType === '*/*') {
      delete allowedTypes['*/*'];
      var allowedList = Object.keys(allowedTypes);
      if (allowedList.length > 0)
        return allowedList[0];
    }

    // If no matching type was found, respond with 406
    res.writeHead(406);
    res.end('Not acceptable.\n');
    throw new Error('Not acceptable: ' + acceptHeader);
  },

  // Stops the server
  stop: function () {
    // Close data sources
    for (var datasourceName in this._datasources) {
      try { this._datasources[datasourceName].close(); }
      catch (error) { }
    }
    // Don't accept new connections, and close existing ones
    this.close();
    for (var id in this._sockets)
      this._sockets[id].destroy();
  },
};

// Parses an entity (URI, literal, or blank) into canonical form
function parseEntity(entity, prefixes) {
  // falsy, variable, or blank indicates an unknown
  if (!entity || /^\?|^_:/.test(entity))
    return null;
  // angular brackets indicate a URI
  var match = /^<(.*)>$/.exec(entity);
  if (match)
    return match[1];
  // literals don't require extra parsing
  if (N3Util.isLiteral(entity))
    return entity;
  // if it's a QName, expand it
  if (N3Util.isQName(entity))
    try { return N3Util.expandQName(entity, prefixes); }
    catch (error) { /* prefix not found */ }
  // assume it is a URI without angular brackets
  return entity;
}

// Formats a URL with the given components
function formatURL(host, path, query) {
  return url.format({ protocol: 'http', host: host, pathname: path, query: query });
}

module.exports = LinkedDataFragmentsServer;
