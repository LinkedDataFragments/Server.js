/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments */

var path = require('path'),
    express = require('express'),
    qejs = require('qejs'),
    N3Util = require('n3').Util;

var blankNodePattern = /^<?_:/;

// Creates a new LinkedDataFragmentsServer for the specified data sources (key/value object)
function LinkedDataFragmentsServer(datasources, prefixes) {
  // create server
  var app = express();
  for (var member in prototype)
    app[member] = prototype[member];
  app._datasources = datasources;
  app._prefixes = prefixes || {};

  // set up QEJS templates
  app.engine('html', qejsEngine);
  app.set('view engine', 'html');
  app.set('views', path.join(__dirname, '../views'));

  // set up routes
  for (var route in routes)
    app.get(routes[route], app[route].bind(app));
  app.use(app.handleError.bind(app));

  return app;
}

// Handler functions and their corresponding URL patterns
var routes = {
  showIndex: '/',
  queryDatasource: /^\/(\w+)$/,
  sendStylesheet: '/stylesheets/main',
};

var prototype = LinkedDataFragmentsServer.prototype = {
  // Shows the index page with a list of data sources
  showIndex: function (req, res) {
    res.render('index', { datasources: Object.keys(this._datasources) });
  },

  // Show results of a data source query
  queryDatasource: function (req, res) {
    var datasourceName = req.params[0],
        datasource = this._datasources[datasourceName],
        query = req.query,
        pattern = { subject: parseEntity(query.subject, this._prefixes),
                    predicate: parseEntity(query.predicate, this._prefixes),
                    object: parseEntity(query.object, this._prefixes) };

    res.render('datasource', {
      datasourceName: datasourceName,
      query: query,
      pattern: pattern,
      queryResult: datasource.query(pattern),
      N3Util: N3Util,
    });
  },

  sendStylesheet: function (req, res) {
    res.sendfile('views/main.css');
  },

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
  // otherwise, it must be a literal
  return entity;
}

// Renders the file with the QEJS engine
function qejsEngine(path, options, callback) {
  qejs.renderFile(path, options).then(callback.bind(null, null), callback);
}

module.exports = LinkedDataFragmentsServer;
