/*! @license MIT ©2013-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* Logic for starting an LDF server with a given config from the command line. */

import type { Cluster } from 'cluster';
import { ComponentsManager } from 'componentsjs';
import type { ConfigRegistry, IComponentsManagerBuilderOptions } from 'componentsjs';

// The 'cluster' module's own type declarations use an ESM-style default
// export that doesn't line up with plain CJS `require()` under
// esModuleInterop:false, so the value is pulled in untyped and annotated
// explicitly against the real `Cluster` interface instead.
const cluster: Cluster = require('cluster');
import { LinkedDataFragmentsServerWorker } from './LinkedDataFragmentsServerWorker';
import type { WorkerConfig } from './types';

type Writable = { write(chunk: string): void };

// Run function for starting the server from the command line
export function runCli(moduleRootPath: string): void {
  let argv = process.argv.slice(2);
  runCustom(argv, process.stdin, process.stdout, process.stderr, null, { mainModulePath: moduleRootPath });
}

// Generic run function for starting the server from a given config
export function runCustom(
  args: string[],
  stdin: NodeJS.ReadableStream,
  stdout: Writable,
  stderr: Writable,
  componentConfigUri: string | null,
  properties: Record<string, any>,
): void {
  if (args.length < 1 || args.length > 4 || /^--?h(elp)?$/.test(args[0])) {
    stdout.write('usage: server config.json [port [workers [componentConfigUri]]]\n');
    return process.exit(1);
  }

  let cliPort = parseInt(args[1], 10),
      cliWorkers = parseInt(args[2], 10),
      configUri = args[3] || componentConfigUri || 'urn:ldf-server:my';

  ComponentsManager.build<LinkedDataFragmentsServerWorker>({
    ...properties,
    configLoader: (registry: ConfigRegistry) => registry.register(args[0]),
  } as IComponentsManagerBuilderOptions<LinkedDataFragmentsServerWorker>)
    .then((manager) => {
      return manager.instantiate(configUri)
        .then((worker) => {
          if (cluster.isMaster)
            startClusterMaster(worker._config);
          else
            worker.run(cliPort);
        })
        .catch((e: Error) => {
          stderr.write('Instantiation error:\n');
          stderr.write((e.stack as string) + '\n');
          process.exit(1);
        });
    })
    .catch((e: Error) => {
      stderr.write('Component definition error:\n');
      stderr.write((e.stack as string) + '\n');
      process.exit(1);
    });

  function startClusterMaster(config: WorkerConfig & { workers?: number }): void {
    let workers = cliWorkers || config.workers || 1;

    // Create workers
    stdout.write('Master ' + process.pid + ' running.\n');
    for (let i = 0; i < workers; i++)
      cluster.fork();

    // Respawn crashed workers
    cluster.on('listening', (worker) => {
      worker.once('exit', (code, signal) => {
        if (!worker.exitedAfterDisconnect) {
          stdout.write('Worker ' + (worker.process.pid as number) + 'died with ' + (code || signal) + '. Starting new worker.\n');
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
      let workers = Object.keys(cluster.workers!).map((id) => { return cluster.workers![id]!; });
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
              stdout.write('Worker ' + (newWorker.process.pid as number) + ' replaces killed worker ' + (worker.process.pid as number) + '.\n');
              respawnNext();
            });
            worker.kill();
            newWorker.removeListener('exit', abort);
          });
          // Abort the respawning process if creating a new worker fails
          newWorker.on('exit', abort);
          function abort(code: number, signal: string) {
            if (!newWorker.exitedAfterDisconnect) {
              stdout.write('Respawning aborted because worker ' + (newWorker.process.pid as number) + ' died with ' +
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

