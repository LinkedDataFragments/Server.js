/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    cluster = require('cluster'),
    LinkedDataFragmentsServer = require('../lib/LinkedDataFragmentsServer'),
    IndexDatasource = require('../lib/datasources/IndexDatasource'),
    ViewCollection = require('../lib/views/ViewCollection.js');

function main(config, logger) {
  var port = config.port,
      workers = config.workers,
      protocol = config.protocol,
      constructors = {};

// Determine protocol
  if (!protocol) {
    var protocolMatch = (config.baseURL || '').match(/^(\w+):/);
    protocol = config.protocol = protocolMatch ? protocolMatch[1] : 'http';
  }

// Start up a cluster master
  if (cluster.isMaster) {
    // Create workers
    logger.log('Master %d running on %s://localhost:%d/.', process.pid, protocol, port);
    for (var i = 0; i < workers; i++)
      cluster.fork();


    // Respawn crashed workers
    cluster.on('listening', function (worker) {
      worker.once('exit', function (code, signal) {
        if (!worker.suicide) {
          logger.log('Worker %d died with %s. Starting new worker.',
            worker.process.pid, code || signal);
          cluster.fork();
        }
      });
    });

    // Respawn workers one by one when receiving a SIGHUP signal
    process.on('SIGHUP', respawn);
  }
// Start up a worker
  else {
    // Configure preset URLs
    var baseURL = config.baseURL = config.baseURL.replace(/\/?$/, '/'),
        baseURLRoot = baseURL.match(/^(?:https?:\/\/[^\/]+)?/)[0],
        baseURLPath = baseURL.substr(baseURLRoot.length),
        blankNodePath = baseURLRoot ? '/.well-known/genid/' : '',
        blankNodePrefix = blankNodePath ? baseURLRoot + blankNodePath : 'genid:';

    // Create all data sources
    var datasources = config.datasources, datasourceBase = baseURLPath.substr(1), dereference = config.dereference;
    Object.keys(datasources).forEach(function (datasourceName) {
      var datasourceConfig = config.datasources[datasourceName], datasourcePath;
      delete datasources[datasourceName];
      if (datasourceConfig.enabled !== false) {
        try {
          // Avoid illegal URI characters in data source path
          datasourcePath = datasourceBase + encodeURI(datasourceName);
          datasources[datasourcePath] = datasourceConfig;
          // Set up blank-node-to-IRI translation, with dereferenceable URLs when possible
          datasourceConfig.settings = _.defaults(datasourceConfig.settings || {}, config);
          if (!datasourceConfig.settings.blankNodePrefix) {
            datasourceConfig.settings.blankNodePrefix = blankNodePrefix + datasourcePath + '/';
            if (blankNodePath)
              dereference[blankNodePath + datasourcePath + '/'] = datasourcePath;
          }
          // Create the data source
          var datasource = instantiate(datasourceConfig, '../lib/datasources/');
          datasource.on('error', datasourceError);
          datasourceConfig.datasource = datasource;
          datasourceConfig.url = baseURLRoot + '/' + datasourcePath + '#dataset';
          datasourceConfig.title = datasourceConfig.title || datasourceName;
        }
        catch (error) {
          datasourceError(error);
        }

        function datasourceError(error) {
          delete datasources[datasourcePath];
          process.stderr.write('WARNING: skipped datasource ' + datasourceName + '. ' + error.message + '\n');
        }
      }
    });

    // Create index data source
    var indexPath = datasourceBase.replace(/\/$/, '');
    datasources[indexPath] = datasources[indexPath] || {
      url: baseURLRoot + '/' + indexPath + '#dataset',
      role: 'index',
      title: 'dataset index',
      datasource: new IndexDatasource({ datasources: datasources }),
    };

    // Set up assets
    config.assetsPath = baseURLPath + 'assets/';

    // Set up routers, views, and controllers
    config.routers = instantiateAll(config.routers, '../lib/routers/');
    config.views = new ViewCollection();
    config.views.addViews(instantiateAll(findFiles('../lib/views', /\.js$/)));
    config.controllers = instantiateAll(config.controllers, '../lib/controllers/');

    // Set up logging
    var loggingSettings = config.logging;
    config.log = logger.log;
    if (loggingSettings.enabled) {
      var accesslog = require('access-log');
      config.accesslogger = function (request, response) {
        accesslog(request, response, loggingSettings.format, function (logEntry) {
          if (loggingSettings.file) {
            fs.appendFile(loggingSettings.file, logEntry + '\n', function (error) {
              error && process.stderr.write('Error when writing to access log file: ' + error);
            });
          }
          else
            logger.log(logEntry);
        });
      };
    }

    // Create server, and start it when all data sources are ready
    var server = new LinkedDataFragmentsServer(config),
        pending = _.size(datasources);
    _.each(datasources, function (settings) {
      var ready = _.once(startWhenReady);
      settings.datasource.once('initialized', ready);
      settings.datasource.once('error', ready);
    });

    function startWhenReady() {
      if (!--pending) {
        server.listen(port);
        logger.log('Worker %d running on %s://localhost:%d/.', process.pid, protocol, port);
      }
    }

    // Terminate gracefully if possible
    process.once('SIGINT', function () {
      logger.log('Stopping worker', process.pid);
      server.stop();
      process.on('SIGINT', function () {
        process.exit(1);
      });
    });
  }


// Instantiates an object from the given description
  function instantiate(description, includePath) {
    var type = description.type || description,
        typePath = path.join(includePath ? path.resolve(__dirname, includePath) : '', type),
        Constructor = constructors[typePath] || (constructors[typePath] = require(typePath)),
        extensions = config.extensions && config.extensions[type] || [],
        settings = _.defaults(description.settings || {}, {
          extensions: extensions.map(function (x) {
            return instantiate(x, includePath);
          }),
        }, config);
    return new Constructor(settings, config);
  }

// Instantiates all objects from the given descriptions
  function instantiateAll(descriptions, includePath) {
    return (_.isArray(descriptions) ? _.map : _.mapValues)(descriptions,
      function (description) {
        return instantiate(description, includePath);
      });
  }

// Recursively finds files in a folder whose name matches the pattern
  function findFiles(folder, pattern, includeCurrentFolder) {
    folder = path.resolve(__dirname, folder);
    return _.flatten(_.compact(fs.readdirSync(folder).map(function (name) {
      name = path.join(folder, name);
      if (fs.statSync(name).isDirectory())
        return findFiles(name, pattern, true);

      else if (includeCurrentFolder && pattern.test(name))
        return name;
    })));
  }

  function respawn() {
    logger.log('Respawning workers of master %d.', process.pid);
    process.addListener('SIGHUP', respawnPending);
    process.removeListener('SIGHUP', respawn);

    // Retrieve a list of old workers that will be replaced by new ones
    var workers = Object.keys(cluster.workers).map(function (id) {
      return cluster.workers[id];
    });
    respawnNext(workers);
  }

  function respawnNext(workers) {
    // If there are still old workers, respawn a new one
    if (workers.length) {
      // Wait until the new worker starts listening to kill the old one
      var newWorker = cluster.fork();
      newWorker.once('listening', function () {
        var worker = workers.pop();
        if (!worker)
          return newWorker.kill(), respawnNext(workers);
        // Dead workers are replaced automatically
        worker.once('exit', function () {
          logger.log('Worker %d replaces killed worker %d.',
            newWorker.process.pid, worker.process.pid);
          respawnNext(workers);
        });
        worker.kill();
        newWorker.removeListener('exit', abort);
      });
      // Abort the respawning process if creating a new worker fails
      newWorker.on('exit', abort);

      function abort(code, signal) {
        if (!newWorker.suicide) {
          logger.log('Respawning aborted because worker %d died with %s.',
            newWorker.process.pid, code || signal);
          process.addListener('SIGHUP', respawn);
          process.removeListener('SIGHUP', respawnPending);
        }
      }
    }
    // No old workers left, so respawning has finished
    else {
      process.addListener('SIGHUP', respawn);
      process.removeListener('SIGHUP', respawnPending);
      logger.log('Respawned all workers of master %d.', process.pid);
    }
  }

  function respawnPending() {
    logger.log('Respawning already in progress');
  }
}

module.exports = main;
