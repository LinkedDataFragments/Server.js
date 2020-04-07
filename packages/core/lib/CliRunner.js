/*! @license MIT ©2013-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* Logic for starting an LDF server with a given config from the command line. */

let cluster = require('cluster'),
    ComponentsLoader = require('componentsjs').Loader;

// Run function for starting the server from the command line
function runCli(moduleRootPath) {
  let argv = process.argv.slice(2);
  runCustom(argv, process.stdin, process.stdout, process.stderr, null, { mainModulePath: moduleRootPath });
}

// Generic run function for starting the server from a given config
function runCustom(args, stdin, stdout, stderr, componentConfigUri, properties) {
  if (args.length < 1 || args.length > 4 || /^--?h(elp)?$/.test(args[0])) {
    stdout.write('usage: server config.json [port [workers [componentConfigUri]]]\n');
    return process.exit(1);
  }

  let cliPort = parseInt(args[1], 10),
      cliWorkers = parseInt(args[2], 10),
      configUri = args[3] || componentConfigUri || 'urn:ldf-server:my';

  let loader = new ComponentsLoader(properties);
  loader.registerAvailableModuleResources()
    .then(() => {
      // Start up a cluster master
      if (cluster.isMaster) {
        return loader.getConfigConstructorFromUrl(configUri, args[0])
          .then((constructor) => {
            return constructor.makeArguments(true).then((args) => {
              startClusterMaster(args[0]);
            });
          })
          .catch((e) => {
            stderr.write('Config error:\n');
            stderr.write(e + '\n');
            process.exit(1);
          });
      }
      else {
        return loader.instantiateFromUrl(configUri, args[0])
          .then((worker) => {
            worker.run(cliPort);
          })
          .catch((e) => {
            stderr.write('Instantiation error:\n');
            stderr.write(e + '\n');
            process.exit(1);
          });
      }
    })
    .catch((e) => {
      stderr.write('Component definition error:\n');
      stderr.write(e + '\n');
      process.exit(1);
    });

  function startClusterMaster(config) {
    let workers = cliWorkers || config.workers || 1;

    // Create workers
    stdout.write('Master ' + process.pid + ' running.\n');
    for (let i = 0; i < workers; i++)
      cluster.fork();

    // Respawn crashed workers
    cluster.on('listening', (worker) => {
      worker.once('exit', (code, signal) => {
        if (!worker.exitedAfterDisconnect) {
          stdout.write('Worker ' + worker.process.pid + 'died with ' + (code || signal) + '. Starting new worker.\n');
          cluster.fork();
        }
      });
    });

    // Disconnect from cluster on SIGINT, so that the process can cleanly terminate
    process.once('SIGINT', () => {
      cluster.disconnect();
    });

    // Respawn workers one by one when receiving a SIGHUP signal
    process.on('SIGHUP', function respawn() {
      stdout.write('Respawning workers of master ' + process.pid + '.\n');
      process.addListener('SIGHUP', respawnPending);
      process.removeListener('SIGHUP', respawn);

      // Retrieve a list of old workers that will be replaced by new ones
      let workers = Object.keys(cluster.workers).map((id) => { return cluster.workers[id]; });
      (function respawnNext() {
        // If there are still old workers, respawn a new one
        if (workers.length) {
          // Wait until the new worker starts listening to kill the old one
          let newWorker = cluster.fork();
          newWorker.once('listening', () => {
            let worker = workers.pop();
            if (!worker)
              return newWorker.kill(), respawnNext(); // Dead workers are replaced automatically
            worker.once('exit', () => {
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
