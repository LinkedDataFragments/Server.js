/*! @license MIT ©2014-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* LinkedDataFragmentsServerRunner is able to run a Linked Data Fragments server */

var _ = require('lodash'),
    fs = require('fs'),
    LinkedDataFragmentsServer = require('./LinkedDataFragmentsServer');

// Creates a new LinkedDataFragmentsServerWorker
class LinkedDataFragmentsServerWorker {
  constructor(config) {
    if (!config.datasources)
      throw new Error('At least one datasource must be defined.');
    if (!config.controllers)
      throw new Error('At least one controller must be defined.');
    if (!config.routers)
      throw new Error('At least one router must be defined.');

    // Create all data sources
    Object.keys(config.datasources).forEach(function (datasourceId) {
      var datasource = config.datasources[datasourceId];
      datasource.on('error', datasourceError);
      function datasourceError(error) {
        config.datasources[datasourceId].hide = true;
        process.stderr.write('WARNING: skipped datasource ' + datasourceId + '. ' + error.message + '\n');
      }
    });

    // Set up logging
    var loggingSettings = config.logging;
    // eslint-disable-next-line no-console
    config.log = console.log;
    if (loggingSettings.enabled) {
      var accesslog = require('access-log');
      config.accesslogger = function (request, response) {
        accesslog(request, response, null, function (logEntry) {
          fs.appendFile(loggingSettings.file, logEntry + '\n', function (error) {
            error && process.stderr.write('Error when writing to access log file: ' + error);
          });
        });
      };
    }

    // Make sure the 'last' controllers are last in the array and the 'first' are first.
    var lastControllers = _.remove(config.controllers, function (controller) {
      return controller._last;
    });
    var firstControllers = _.remove(config.controllers, function (controller) {
      return controller._first;
    });
    config.controllers = firstControllers.concat(config.controllers.concat(lastControllers));

    this._config = config;
  }
}

// Start the worker
LinkedDataFragmentsServerWorker.prototype.run = function (port) {
  var config = this._config;
  if (port)
    config.port = port;
  var server = new LinkedDataFragmentsServer(config);

  // Start the server when all data sources are ready
  var pending = _.size(config.datasources);
  _.each(config.datasources, function (datasource) {
    // Add datasource ready-listener
    var ready = _.once(startWhenReady);
    datasource.once('initialized', ready);
    datasource.once('error', ready);

    // Init datasource asynchronously
    datasource.initialize();
  });
  function startWhenReady() {
    if (!--pending) {
      server.listen(config.port);
      // eslint-disable-next-line no-console
      console.log('Worker %d running on %s://localhost:%d/ (URL: %s).',
        process.pid, config.urlData.protocol, config.port, config.urlData.baseURL);
    }
  }

  // Terminate gracefully if possible
  process.once('SIGINT', function () {
    // eslint-disable-next-line no-console
    console.log('Stopping worker', process.pid);
    server.stop();
    process.on('SIGINT', function () { process.exit(1); });
  });
};

module.exports = LinkedDataFragmentsServerWorker;
