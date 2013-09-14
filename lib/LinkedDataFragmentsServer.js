// LinkedDataFragmentsServer is an HTTP server that provides access to Linked Data Fragments

var path = require('path'),
    express = require('express'),
    qejs = require('qejs');

// Creates a new LinkedDataFragmentsServer for the specified data sources (key/value object)
function LinkedDataFragmentsServer(datasources) {
  var app = express();
  app._datasources = datasources;

  // set up QEJS templates
  app.engine('html', qejsEngine);
  app.set('view engine', 'html');
  app.set('views', path.join(__dirname, '../views'));

  // set up routes
  for (var route in routes)
    app.get(routes[route], prototype[route].bind(app));

  return app;
}

// Handler functions and their corresponding URL patterns
var routes = {
  showIndex: '/',
  queryDatasource: /^\/(\w+)$/,
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
        query = req.query;

    res.render('datasource', {
      datasourceName: datasourceName,
      query: query,
      queryResults: datasource.query(query.subject, query.predicate, query.object),
    });
  },
};

// Renders the file with the QEJS engine
function qejsEngine(path, options, callback) {
  qejs.renderFile(path, options).then(callback.bind(null, null), callback);
}

module.exports = LinkedDataFragmentsServer;
