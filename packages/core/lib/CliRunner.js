/*! @license MIT ©2013-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* Logic for starting an LDF server with a given config from the command line. */

var cluster = require('cluster'),
    ComponentsLoader = require('componentsjs').Loader;

// Run function for starting the server from the command line
function runCli(moduleRootPath, defaultConfigPath) {
  var argv = process.argv.slice(2);
  runCustom(defaultConfigPath, argv, process.stdin, process.stdout, process.stderr, null, { mainModulePath: moduleRootPath });
}

// Generic run function for starting the server from a given config
function runCustom(configResourceUrl, args, stdin, stdout, stderr, componentConfigUri, properties) {
  if (args.length < 1 || args.length > 4 || /^--?h(elp)?$/.test(args[0])) {
    stdout.write('usage: server config.json [port [workers [componentConfigUri]]]\n');
    return process.exit(1);
  }

  var cliPort = parseInt(args[1], 10),
      cliWorkers = parseInt(args[2], 10),
      configUri = args[3] || componentConfigUri || 'urn:ldf-server:my';

  var loader = new ComponentsLoader(properties);
  loader.registerAvailableModuleResources()
    .then(function () {
      // Start up a cluster master
      if (cluster.isMaster) {
        return loader.getConfigConstructorFromUrl(configUri, args[0])
          .then(function (constructor) {
            return constructor.makeArguments(true).then(function (args) {
              startClusterMaster(args[0]);
            });
          })
          .catch(function (e) {
            stderr.write('Config error:\n');
            stderr.write(e + '\n');
            process.exit(1);
          });
      }
      else {
        return loader.instantiateFromUrl(configUri, args[0])
          .then(function (worker) {
            worker.run(cliPort);
          })
          .catch(function (e) {
            stderr.write('Instantiation error:\n');
            stderr.write(e + '\n');
            process.exit(1);
          });
      }
    })
    .catch(function (e) {
      stderr.write('Component definition error:\n');
      stderr.write(e + '\n');
      process.exit(1);
    });

  function startClusterMaster(config) {
    var workers = cliWorkers || config.workers || 1;

    // Create workers
    stdout.write('Master ' + process.pid + ' running.\n');
    for (var i = 0; i < workers; i++)
      cluster.fork();

    // Respawn crashed workers
    cluster.on('listening', function (worker) {
      worker.once('exit', function (code, signal) {
        if (!worker.exitedAfterDisconnect) {
          stdout.write('Worker ' + worker.process.pid + 'died with ' + (code || signal) + '. Starting new worker.\n');
          cluster.fork();
        }
      });
    });

    // Disconnect from cluster on SIGINT, so that the process can cleanly terminate
    process.once('SIGINT', function () {
      cluster.disconnect();
    });

    // Respawn workers one by one when receiving a SIGHUP signal
    process.on('SIGHUP', function respawn() {
      stdout.write('Respawning workers of master ' + process.pid + '.\n');
      process.addListener('SIGHUP', respawnPending);
      process.removeListener('SIGHUP', respawn);

      // Retrieve a list of old workers that will be replaced by new ones
      var workers = Object.keys(cluster.workers).map(function (id) { return cluster.workers[id]; });
      (function respawnNext() {
        // If there are still old workers, respawn a new one
        if (workers.length) {
          // Wait until the new worker starts listening to kill the old one
          var newWorker = cluster.fork();
          newWorker.once('listening', function () {
            var worker = workers.pop();
            if (!worker)
              return newWorker.kill(), respawnNext(); // Dead workers are replaced automatically
            worker.once('exit', function () {
              stdout.write('Worker ' + newWorker.process.pid + ' replaces killed worker ' + worker.process.pid + '.\n');
              respawnNext();
            });
            worker.kill();
            newWorker.removeListener('exit', abort);
          });
          // Abort the respawning process if creating a new worker fails
          newWorker.on('exit', abort);
          function abort(code, signal) {
            if (!newWorker.suicide) {
              stdout.write('Respawning aborted because worker ' + newWorker.process.pid + ' died with ' +
                (code || signal) + '.\n');
              process.addListener('SIGHUP', respawn);
              process.removeListener('SIGHUP', respawnPending);
            }
          }
        }
        // No old workers left, so respawning has finished
        else {
          process.addListener('SIGHUP', respawn);
          process.removeListener('SIGHUP', respawnPending);
          stdout.write('Respawned all workers of master ' + process.pid + '.\n');
        }
      })();
      function respawnPending() { stdout.write('Respawning already in progress\n'); }
    });
  }
}

module.exports = { runCli: runCli, runCustom: runCustom };
