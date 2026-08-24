/*! @license MIT ©2014-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */

import { describe, it, expect, afterEach, vi } from 'vitest';
const { EventEmitter } = require('events');
const { promisify } = require('util');
let LinkedDataFragmentsServerWorker = require('../lib/LinkedDataFragmentsServerWorker').LinkedDataFragmentsServerWorker;

const tick = promisify(setImmediate);

function fakeDatasource() {
  let ds = new EventEmitter();
  ds.initialize = vi.fn(() => setImmediate(() => ds.emit('initialized')));
  return ds;
}

function baseConfig(overrides) {
  return Object.assign({
    datasources: { a: fakeDatasource() },
    controllers: [{ handleRequest: (request, response, next) => next() }],
    routers: [],
    logging: {},
  }, overrides);
}

describe('LinkedDataFragmentsServerWorker', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  describe('The LinkedDataFragmentsServerWorker module', () => {
    it('should be a function', () => {
      expect(typeof LinkedDataFragmentsServerWorker).toBe('function');
    });
  });

  describe('constructing a worker', () => {
    it('should throw without a datasources option', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new LinkedDataFragmentsServerWorker(baseConfig({ datasources: undefined }));
      }).toThrow('At least one datasource must be defined.');
    });

    it('should throw without a controllers option', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new LinkedDataFragmentsServerWorker(baseConfig({ controllers: undefined }));
      }).toThrow('At least one controller must be defined.');
    });

    it('should throw without a routers option', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new LinkedDataFragmentsServerWorker(baseConfig({ routers: undefined }));
      }).toThrow('At least one router must be defined.');
    });

    it('should order controllers with _first ones first and _last ones last', () => {
      let a = { handleRequest: () => {} },
          b = { handleRequest: () => {}, _last: true },
          c = { handleRequest: () => {}, _first: true },
          d = { handleRequest: () => {} };
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({ controllers: [a, b, c, d] }));
      expect(worker._config.controllers).toEqual([c, a, d, b]);
    });

    it('should hide a datasource and warn when it errors', () => {
      let datasource = fakeDatasource();
      let stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => {});
      let config = baseConfig({ datasources: { mine: datasource } });
      // eslint-disable-next-line no-new
      new LinkedDataFragmentsServerWorker(config);
      datasource.emit('error', new Error('connection refused'));

      expect(config.datasources.mine.hide).toBe(true);
      expect(stderrWrite).toHaveBeenCalledWith(expect.stringMatching(/skipped datasource mine.*connection refused/));
    });

    it('should always set config.log to console.log', () => {
      let config = baseConfig();
      // eslint-disable-next-line no-new
      new LinkedDataFragmentsServerWorker(config);
      // eslint-disable-next-line no-console
      expect(config.log).toBe(console.log);
    });

    it('should not set an accesslogger when logging is not enabled', () => {
      let config = baseConfig({ logging: {} });
      // eslint-disable-next-line no-new
      new LinkedDataFragmentsServerWorker(config);
      expect(config.accesslogger).toBeUndefined();
    });

    it('should set a function accesslogger when logging is enabled', () => {
      let config = baseConfig({ logging: { enabled: true, file: '/tmp/access.log' } });
      // eslint-disable-next-line no-new
      new LinkedDataFragmentsServerWorker(config);
      expect(typeof config.accesslogger).toBe('function');
    });

    // TODO: access-log treats a `null` third argument as an options object
    // (`typeof null === 'object'`) and crashes reading `.format` off it,
    // so the accesslogger throws on every real invocation. Fix or replace it.
    it('should throw when the accesslogger is actually invoked, due to a bug in access-log itself', () => {
      let config = baseConfig({ logging: { enabled: true, file: '/tmp/access.log' } });
      // eslint-disable-next-line no-new
      new LinkedDataFragmentsServerWorker(config);
      let request = { connection: { remoteAddress: '127.0.0.1' }, url: '/foo', method: 'GET', headers: {} };
      let response = { writeHead: () => {}, end: () => {}, statusCode: 200 };

      expect(() => { config.accesslogger(request, response); }).toThrow(/format/);
    });

    it('should append the log entry to the access log file', () => {
      let fs = require('fs');
      let accessLogPath = require.resolve('access-log');
      let originalExports = require.cache[accessLogPath].exports;
      // eslint-disable-next-line promise/prefer-await-to-callbacks -- simulates access-log's own callback-based API
      require.cache[accessLogPath].exports = (req, res, format, cb) => cb('fake log entry');
      let appendFile = vi.spyOn(fs, 'appendFile').mockImplementation(() => {});
      try {
        let config = baseConfig({ logging: { enabled: true, file: '/tmp/access.log' } });
        // eslint-disable-next-line no-new
        new LinkedDataFragmentsServerWorker(config);
        let request = { connection: { remoteAddress: '127.0.0.1' }, url: '/foo', method: 'GET', headers: {} };
        let response = { writeHead: () => {}, end: () => {}, statusCode: 200 };

        config.accesslogger(request, response);
        expect(appendFile).toHaveBeenCalledWith('/tmp/access.log', 'fake log entry\n', expect.any(Function));

        let stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => {});
        appendFile.mock.calls[0][2](null);
        expect(stderrWrite).not.toHaveBeenCalled();
        appendFile.mock.calls[0][2](new Error('disk full'));
        expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining('Error when writing to access log file'));
      }
      finally {
        require.cache[accessLogPath].exports = originalExports;
      }
    });
  });

  describe('run', () => {
    it('should start listening once all datasources are ready', async () => {
      let datasource = fakeDatasource();
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        datasources: { a: datasource },
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      let log = vi.spyOn(console, 'log').mockImplementation(() => {});
      let once = vi.spyOn(process, 'once').mockImplementation(() => {});

      worker.run();

      await tick();
      await tick();
      expect(datasource.initialize).toHaveBeenCalledOnce();
      expect(log.mock.calls[0][0]).toContain('running on');
      // Stop the real (ephemeral-port) server the handler just started listening on.
      let sigintHandler = once.mock.calls.find((args) => args[0] === 'SIGINT')[1];
      sigintHandler();
      expect(log.mock.calls[1]).toEqual(['Stopping worker', process.pid]);
    });

    it('should wait for every datasource before listening', () => {
      let dsA = new EventEmitter(); dsA.initialize = vi.fn();
      let dsB = new EventEmitter(); dsB.initialize = vi.fn();
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        datasources: { a: dsA, b: dsB },
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      let log = vi.spyOn(console, 'log').mockImplementation(() => {});
      let once = vi.spyOn(process, 'once').mockImplementation(() => {});

      worker.run();
      dsA.emit('initialized');
      expect(log).not.toHaveBeenCalled();
      dsB.emit('initialized');
      expect(log).toHaveBeenCalled();
      // Stop the real (ephemeral-port) server the handler just started listening on.
      once.mock.calls.find((args) => args[0] === 'SIGINT')[1]();
    });

    it('should apply an explicit port argument over the config port', async () => {
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      vi.spyOn(console, 'log').mockImplementation(() => {});
      let once = vi.spyOn(process, 'once').mockImplementation(() => {});

      worker.run(56789);
      expect(worker._config.port).toBe(56789);

      await tick();
      await tick();
      once.mock.calls.find((args) => args[0] === 'SIGINT')[1]();
    });

    it('should leave the config port untouched when called without an argument or with 0', async () => {
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      vi.spyOn(console, 'log').mockImplementation(() => {});
      let once = vi.spyOn(process, 'once').mockImplementation(() => {});
      let portBeforeRun = worker._config.port;

      worker.run(0);
      expect(worker._config.port).toBe(portBeforeRun);

      await tick();
      await tick();
      once.mock.calls.find((args) => args[0] === 'SIGINT')[1]();
    });

    it('should force-exit on a second SIGINT', async () => {
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      vi.spyOn(console, 'log').mockImplementation(() => {});
      let once = vi.spyOn(process, 'once').mockImplementation(() => {});
      let on = vi.spyOn(process, 'on').mockImplementation(() => {});
      let exit = vi.spyOn(process, 'exit').mockImplementation(() => {});

      worker.run();

      await tick();
      await tick();
      once.mock.calls.find((args) => args[0] === 'SIGINT')[1]();
      let secondSigintHandler = on.mock.calls.find((args) => args[0] === 'SIGINT')[1];
      secondSigintHandler();
      expect(exit).toHaveBeenCalledWith(1);
    });
  });
});
