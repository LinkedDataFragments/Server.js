/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var path = require('path'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    conneg = require('connect-conneg'),
    q = require('q'),
    qejs = require('qejs'),
    N3Util = require('n3').Util,
    TurtleFragmentWriter = require('./TurtleFragmentWriter'),
    JsonLdFragmentWriter = require('./JsonLdFragmentWriter');

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
    // Only accept read-only methods
    if (!/^(?:GET|HEAD|OPTIONS)$/.test(req.method))
      return res.writeHead(405), res.end();
    // Parse URL
    var reqUrl = url.parse(req.url, true);
    req.url = encodeURI(decodeURI(req.url));
    req.query = reqUrl.query;
    // Set HTTP headers
    res.setHeader('Vary', 'Accept');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Powered-By', 'Linked Data Fragments Server');
    // Execute the correct action
    for (var action in this.routes) {
      var path = this.routes[action], match = reqUrl.pathname.match(path);
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
    var self = this, prefixes = this._prefixes,
        datasourceName = req.params[0] || 'index',
        datasource = this._datasources[datasourceName];
    if (!datasource)
      return this.respondNotFound(req, res);

    // Parse the query and get the result from the data source
    var query = req.query,
        pattern = { subject: parseEntity(query.subject, prefixes),
                    predicate: parseEntity(query.predicate, prefixes),
                    object: parseEntity(query.object, prefixes) },
        queryResult = datasource.query(pattern);

    // Answer in HTML or a triple format
    q.when(queryResult).then(function (queryResult) {
      var statusCode = queryResult.total > 0 ? 200 : 404;
      self.negotiate(req, res, {
        'text/html': function () {
          var template = datasourceName === 'index' ? 'index' : 'datasource';
          self.renderHtml(req, res, template, { cache: true,
            N3Util: N3Util, datasourceName: datasourceName,
            query: query, pattern: pattern, queryResult: queryResult
          }, statusCode);
        },
        'text/turtle': writeTripleFormat.bind(null, TurtleFragmentWriter, 'text/turtle'),
        'application/json': writeTripleFormat.bind(null, JsonLdFragmentWriter, 'application/json'),
        'application/ld+json': writeTripleFormat.bind(null, JsonLdFragmentWriter, 'application/ld+json'),
      });

      // Writes an answer in triple format
      function writeTripleFormat(Writer, contentType) {
        var baseURL = prefixes[''] = 'http://' + req.headers.host,
            writer = new Writer(datasourceName, baseURL + '/' + datasourceName,
                                baseURL + req.url, pattern, self._prefixes);
        res.setHeader('Content-Type', contentType);
        res.writeHead(statusCode);
        writer.write(res, queryResult);
      }
    })
    .catch(function (error) { self.handleError(req, res, error); });
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
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(statusCode || 200);
      res.end(html);
    })
    .fail(function (error) { self.handleError(req, res, error); });
  },

  // Perform content negotiation for the response
  negotiate: function (req, res, options) {
    conneg.acceptedTypes(req, res);
    // Try to execute a handler for an accepted type
    var canAccept = req.acceptableTypes.some(function (type) {
      var handler = options[type];
      if (!handler && type === '*/*')
        handler = options[Object.keys(options)[0]];
      if (typeof handler === 'function')
        return handler(req, res), true;
    });
    // Stop if no acceptable handler found
    if (!canAccept) {
      res.writeHead(406);
      res.end('Not acceptable.\n');
    }
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

module.exports = LinkedDataFragmentsServer;
