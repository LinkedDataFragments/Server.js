// LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments

var path = require('path'),
    express = require('express'),
    qejs = require('qejs');

var blankNodePattern = /^<?_:/;

// Creates a new LinkedDataFragmentsServer for the specified data sources (key/value object)
function LinkedDataFragmentsServer(datasources) {
  // create server
  var app = express();
  for (var member in prototype)
    app[member] = prototype[member];
  app._datasources = datasources;

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
        subject = parseEntity(query.subject),
        predicate = parseEntity(query.predicate),
        object = parseEntity(query.object);

    res.render('datasource', {
      datasourceName: datasourceName,
      query: query,
      queryResults: datasource.query(subject, predicate, object),
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
function parseEntity(entity) {
  // falsy or variable indicates an unknown
  if (!entity || /^<?_:/.test(entity))
    return null;
  // angular brackets indicate a URI
  var match = /^<(.*)>$/.exec(entity);
  return match ? match[1] : entity;
}

// Renders the file with the QEJS engine
function qejsEngine(path, options, callback) {
  qejs.renderFile(path, options).then(callback.bind(null, null), callback);
}

module.exports = LinkedDataFragmentsServer;
