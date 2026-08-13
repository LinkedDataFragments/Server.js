/*! @license MIT ©2014-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const sinon = require('sinon');
const { EventEmitter } = require('events');
let LinkedDataFragmentsServerWorker = require('../lib/LinkedDataFragmentsServerWorker').LinkedDataFragmentsServerWorker;

function fakeDatasource() {
  let ds = new EventEmitter();
  ds.initialize = sinon.spy(() => setImmediate(() => ds.emit('initialized')));
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
  let sandbox;
  beforeEach(() => { sandbox = sinon.sandbox.create(); });
  afterEach(() => { sandbox.restore(); });

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
      let stderrWrite = sandbox.stub(process.stderr, 'write');
      let config = baseConfig({ datasources: { mine: datasource } });
      // eslint-disable-next-line no-new
      new LinkedDataFragmentsServerWorker(config);
      datasource.emit('error', new Error('connection refused'));

      expect(config.datasources.mine.hide).toBe(true);
      expect(stderrWrite.calledWith(sinon.match(/skipped datasource mine.*connection refused/))).toBe(true);
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

    // access-log's own implementation treats a `null` third argument as an
    // options object (`typeof null === 'object'`), so it always crashes
    // reading `.format` off it — this accesslogger throws every time it's
    // actually invoked, regardless of request/response content. A
    // pre-existing bug, preserved as-is; this documents the real behavior.
    it('should throw when the accesslogger is actually invoked, due to a bug in access-log itself', () => {
      let config = baseConfig({ logging: { enabled: true, file: '/tmp/access.log' } });
      // eslint-disable-next-line no-new
      new LinkedDataFragmentsServerWorker(config);
      let request = { connection: { remoteAddress: '127.0.0.1' }, url: '/foo', method: 'GET', headers: {} };
      let response = { writeHead: () => {}, end: () => {}, statusCode: 200 };

      expect(() => { config.accesslogger(request, response); }).toThrow(/format/);
    });
  });

  describe('run', () => {
    // process.once/on are stubbed throughout so the handlers can be invoked
    // directly, the same way CliRunner-test.js drives cluster/process signal
    // handling — this exercises the real logic without ever registering a
    // real process-wide listener that could leak into other tests.
    it('should start listening once all datasources are ready', () => new Promise((done) => {
      let datasource = fakeDatasource();
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        datasources: { a: datasource },
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      let log = sandbox.stub(console, 'log');
      let once = sandbox.stub(process, 'once');

      worker.run();

      setImmediate(() => setImmediate(() => {
        expect(datasource.initialize.calledOnce).toBe(true);
        expect(log.getCall(0).args[0]).toContain('running on');
        // Stop the real (ephemeral-port) server the handler just started listening on.
        let sigintHandler = once.args.find((args) => args[0] === 'SIGINT')[1];
        sigintHandler();
        expect(log.getCall(1).args).toEqual(['Stopping worker', process.pid]);
        done();
      }));
    }));

    it('should apply an explicit port argument over the config port', () => new Promise((done) => {
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      sandbox.stub(console, 'log');
      let once = sandbox.stub(process, 'once');

      worker.run(56789);
      expect(worker._config.port).toBe(56789);

      setImmediate(() => setImmediate(() => {
        once.args.find((args) => args[0] === 'SIGINT')[1]();
        done();
      }));
    }));

    it('should leave the config port untouched when called without an argument or with 0', () => new Promise((done) => {
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      sandbox.stub(console, 'log');
      let once = sandbox.stub(process, 'once');
      let portBeforeRun = worker._config.port;

      worker.run(0);
      expect(worker._config.port).toBe(portBeforeRun);

      setImmediate(() => setImmediate(() => {
        once.args.find((args) => args[0] === 'SIGINT')[1]();
        done();
      }));
    }));

    it('should force-exit on a second SIGINT', () => new Promise((done) => {
      let worker = new LinkedDataFragmentsServerWorker(baseConfig({
        port: 0,
        urlData: { protocol: 'http', baseURL: 'http://localhost/' },
      }));
      sandbox.stub(console, 'log');
      let once = sandbox.stub(process, 'once');
      let on = sandbox.stub(process, 'on');
      let exit = sandbox.stub(process, 'exit');

      worker.run();

      setImmediate(() => setImmediate(() => {
        once.args.find((args) => args[0] === 'SIGINT')[1]();
        let secondSigintHandler = on.args.find((args) => args[0] === 'SIGINT')[1];
        secondSigintHandler();
        expect(exit.calledWith(1)).toBe(true);
        done();
      }));
    }));
  });
});
