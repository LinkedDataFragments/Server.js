/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var path = require('path'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    conneg = require('connect-conneg'),
    _ = require('lodash'),
    qejs = require('qejs'),
    N3Util = require('n3').Util,
    TurtleFragmentWriter = require('./TurtleFragmentWriter'),
    JsonLdFragmentWriter = require('./JsonLdFragmentWriter');

var fragmentWriters = {
  'text/html': require('./HtmlFragmentWriter'),
  'text/turtle': require('./TurtleFragmentWriter'),
  'application/json': require('./JsonLdFragmentWriter'),
  'application/ld+json': require('./JsonLdFragmentWriter'),
};

var viewsFolder = path.join(__dirname, '../views/');

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
  server.on('error', server.handleError.bind(server));
  server.on('connection', function (socket) {
    var sockedId = sockets++;
    server._sockets[sockedId] = socket;
    socket.on('close', function () { delete server._sockets[sockedId]; });
  });
  return server;
}

var prototype = LinkedDataFragmentsServer.prototype = {
  // Handlers and their corresponding URL patterns
  routes: {
    queryDatasource: /^\/([\-a-z_]*)$/i,
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
      return this.redirect(req, res, urlParts.path);
    req.query = urlParts.query;

    // Set HTTP headers
    res.setHeader('Vary', 'Accept');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Powered-By', 'Linked Data Fragments Server');

    // Execute the correct action
    for (var action in this.routes) {
      var path = this.routes[action], match = urlParts.pathname.match(path);
      if (match) {
        req.params = match.splice(1);
        try { return this[action](req, res); }
        catch (error) { return this.handleError(req, res, error); }
      }
    }

    // If no action found, send 404
    this.respondNotFound(req, res);
  },

  // Shows results of a data source query
  queryDatasource: function (req, res) {
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
        contentType = this.negotiate(req, res, Object.keys(fragmentWriters)),
        headers = { 'content-type': contentType + ';charset=utf-8' },
        Writer = fragmentWriters[contentType],
        writer = new Writer(res, { query: query,
          dataset: datasourceName, datasetURL: formatURL(host, datasourceName),
          pattern: pattern, fragmentURL: formatURL(host, datasourceName, query),
          prefixes: prefixes,
        }),
        metadataWritten = false, triplesEnded = false;

    // Writes a triple to the output
    function writeTriple(triple) {
      if (!res.headersSent)
        res.writeHead(200, headers);
      writer.writeTriple(triple);
    }

    // Writes metadata to the output
    function writeMetadata(totalCount) {
      if (!metadataWritten) {
        if (!res.headersSent)
          res.writeHead(totalCount > 0 ? 200 : 404, headers);
        writer.writeMetadata(totalCount);
        metadataWritten = true;
        triplesEnded && end();
      }
    }

    // Ends the output
    function end(error) {
      triplesEnded = true;
      if (error) {
        self.handleError(req, res, error);
      }
      else {
        if (metadataWritten)
          writer.end(function (error) { error && self.handleError(req, res, error); });
        else
          setTimeout(function () { writeMetadata(Math.pow(2, 32)); }, 2000);
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
    var fileName = path.join.apply(path, [viewsFolder].concat(pathParts));
    var fileStream = fs.createReadStream(fileName);
    fileStream.on('error', function () {
      try { res.writeHead(404); }
      finally { res.end(); }
    });
    res.setHeader('Content-Type', mimeType);
    fileStream.pipe(res);
  },

  // Responds to an unknown URL
  respondNotFound: function (req, res) {
    this.renderHtml(req, res, 'notfound', { url: req.url }, 404);
  },

  // Redirects the response
  redirect: function (req, res, location) {
    res.writeHead(301, { location: location });
    res.end('Available at ' + location + '\n');
  },

  // Handles an application error
  handleError: function (req, res, error) {
    // Ensure errors are not handled recursively
    if (req._handlingError)
      throw 'Already handling error.';
    req._handlingError = true;
    // Try to render error response
    this.renderHtml(req, res, 'error', { error: error }, 500)
        .fail(function () { res.end(); });
  },

  // Renders HTML using the given template
  renderHtml: function (req, res, template, variables, statusCode) {
    var self = this;
    return qejs.renderFile(viewsFolder + template + '.html', variables)
    .then(function (html) {
      res.setHeader('Content-Type', 'text/html;charset=utf-8');
      res.writeHead(statusCode || 200);
      res.end(html);
    })
    .fail(function (error) { self.handleError(req, res, error); });
  },

  // Perform content negotiation for the response
  negotiate: function (req, res, options) {
    // Find an acceptable type
    conneg.acceptedTypes(req, res);
    var bestType = req.acceptableTypes[0];
    // Stop if no acceptable handler found
    if (!bestType) {
      res.writeHead(406);
      return res.end('Not acceptable.\n');
    }
    return bestType === '*/*' ? options[0] : bestType;
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
  // if it's a QName, expand it
  if (N3Util.isQName(entity))
    return N3Util.expandQName(entity, prefixes);
  // literals don't require extra parsing
  if (N3Util.isLiteral(entity))
    return entity;
  // assume it is a URI without angular brackets
  return entity;
}

// Formats a URL with the given components
function formatURL(host, path, query) {
  return url.format({ protocol: 'http', host: host, pathname: path, query: query });
}

module.exports = LinkedDataFragmentsServer;
