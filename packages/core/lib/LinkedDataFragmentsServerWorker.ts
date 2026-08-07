/*! @license MIT ©2014-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* LinkedDataFragmentsServerRunner is able to run a Linked Data Fragments server */

import * as _ from 'lodash';
import * as fs from 'fs';
import { LinkedDataFragmentsServer } from './LinkedDataFragmentsServer';
import type { Controller } from './controllers/Controller';
import type { LdfRequest, LdfResponse, WorkerConfig } from './types';

type AccessLog = (request: LdfRequest, response: LdfResponse, opts: null, callback: (logEntry: string) => void) => void;

// Creates a new LinkedDataFragmentsServerWorker
export class LinkedDataFragmentsServerWorker {
  _config: WorkerConfig;

  constructor(config: WorkerConfig) {
    if (!config.datasources)
      throw new Error('At least one datasource must be defined.');
    if (!config.controllers)
      throw new Error('At least one controller must be defined.');
    if (!config.routers)
      throw new Error('At least one router must be defined.');

    // Create all data sources
    Object.keys(config.datasources).forEach((datasourceId) => {
      let datasource = config.datasources[datasourceId];
      datasource.on('error', datasourceError);
      function datasourceError(error: Error) {
        config.datasources[datasourceId].hide = true;
        process.stderr.write('WARNING: skipped datasource ' + datasourceId + '. ' + error.message + '\n');
      }
    });

    // Set up logging
    let loggingSettings = config.logging;
    // eslint-disable-next-line no-console
    config.log = console.log;
    if (loggingSettings.enabled) {
      let accesslog = require('access-log') as AccessLog;
      config.accesslogger = function (request: LdfRequest, response: LdfResponse) {
        accesslog(request, response, null, (logEntry: string) => {
          fs.appendFile(loggingSettings.file!, logEntry + '\n', (error) => {
            error && process.stderr.write('Error when writing to access log file: ' + String(error));
          });
        });
      };
    }

    // Make sure the 'last' controllers are last in the array and the 'first' are first.
    let lastControllers = _.remove(config.controllers, (controller: Controller) => {
      return controller._last;
    });
    let firstControllers = _.remove(config.controllers, (controller: Controller) => {
      return controller._first;
    });
    config.controllers = firstControllers.concat(config.controllers.concat(lastControllers));

    this._config = config;
  }

  // Start the worker
  run(port?: number): void {
    let config = this._config;
    if (port)
      config.port = port;
    let server = new LinkedDataFragmentsServer(config);

    // Start the server when all data sources are ready
    let pending = Object.keys(config.datasources).length;
    for (const datasourceId in config.datasources) {
      const datasource = config.datasources[datasourceId];
      // Add datasource ready-listener
      let ready = _.once(startWhenReady);
      datasource.once('initialized', ready);
      datasource.once('error', ready);

      // Init datasource asynchronously
      datasource.initialize();
    }
    function startWhenReady() {
      if (!--pending) {
        server.listen(config.port);
        // eslint-disable-next-line no-console
        console.log('Worker %d running on %s://localhost:%d/ (URL: %s).',
          process.pid, config.urlData!.protocol, config.port, config.urlData!.baseURL);
      }
    }

    // Terminate gracefully if possible
    process.once('SIGINT', () => {
      // eslint-disable-next-line no-console
      console.log('Stopping worker', process.pid);
      server.stop();
      process.on('SIGINT', () => { process.exit(1); });
    });
  }
}
