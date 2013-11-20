/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var path = require('path'),
    express = require('express'),
    negotiate = require('express-negotiate'),
    q = require('q'),
    qejs = require('qejs'),
    N3Writer = require('n3').Writer,
    N3Util = require('n3').Util;

var blankNodePattern = /^<?_:/,
    xsd = 'http://www.w3.org/2001/XMLSchema',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new LinkedDataFragmentsServer for the specified data sources (key/value object)
function LinkedDataFragmentsServer(baseURL, datasources, prefixes) {
  // create server
  var app = express();
  for (var member in prototype)
    app[member] = prototype[member];
  app._baseURL = baseURL ? baseURL.replace(/\/+$/, '') : '';
  app._datasources = datasources || [];
  app._prefixes = prefixes || {};

  // set up QEJS templates
  app.engine('html', qejsEngine);
  app.set('view engine', 'html');
  app.set('views', path.join(__dirname, '../views'));

  // set up routes
  app.use(app.addHeaders.bind(app));
  for (var route in routes)
    app.get(routes[route], app[route].bind(app));
  app.use(app.handleError.bind(app));

  return app;
}

// Handler functions and their corresponding URL patterns
var routes = {
  queryDatasource: /^\/(\w*)$/,
  sendStylesheet: '/stylesheets/main',
};

var prototype = LinkedDataFragmentsServer.prototype = {
  addHeaders: function (req, res, next) {
    res.set('Vary', 'Accept');
    res.set('X-Powered-By', 'Linked Data Fragments Server');
    next();
  },

  // Shows results of a data source query
  queryDatasource: function (req, res) {
    var baseURL = this._baseURL,
        datasourceName = req.params[0] || 'index',
        datasource = this._datasources[datasourceName],
        query = req.query,
        pattern = { subject: parseEntity(query.subject, this._prefixes),
                    predicate: parseEntity(query.predicate, this._prefixes),
                    object: parseEntity(query.object, this._prefixes) },
        queryResult = datasource.query(pattern);

    req.negotiate({
      'text/html': function () {
        var template = datasourceName === 'index' ? 'index' : 'datasource';
        res.render(template, { N3Util: N3Util, datasourceName: datasourceName,
                               query: query, pattern: pattern, queryResult: queryResult });
      },
      'text/turtle': function () {
        q.when(queryResult).then(function (queryResult) {
          var writer = new N3Writer(res);
          res.set('Content-Type', 'text/turtle; charset=utf-8');
          writer.addTriple({ subject: baseURL + req.url, predicate: voID + 'triples',
                             object: '"' + queryResult.total + '"^^<' + xsd + 'integer>' });
          queryResult.triples.forEach(writer.addTriple.bind(writer));
          writer.end();
        });
      },
    });
  },

  // Sends the stylesheet
  sendStylesheet: function (req, res) {
    res.sendfile('views/main.css');
  },

  // Handles an application error
  handleError: function (error, req, res, next) {
    res.status(500);
    res.render('error', { error: error });
  },
};

// Parses an entity (URI, literal, or blank) into canonical form
function parseEntity(entity, prefixes) {
  // falsy or variable indicates an unknown
  if (!entity || /^<?_:/.test(entity))
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

// Renders the file with the QEJS engine
function qejsEngine(path, options, callback) {
  qejs.renderFile(path, options).then(callback.bind(null, null), callback);
}

module.exports = LinkedDataFragmentsServer;
