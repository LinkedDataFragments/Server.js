/*! @license MIT ©2013-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
let CliRunner = require('../lib/CliRunner'),
    runCli = CliRunner.runCli,
    runCustom = CliRunner.runCustom;

const ComponentsManager = require('componentsjs').ComponentsManager;
const EventEmitter = require('events').EventEmitter;
const cluster = require('cluster');

function fakeWritable() {
  return { write: vi.fn() };
}

describe('CliRunner', () => {
  let originalIsMaster, originalWorkers;
  beforeEach(() => {
    originalIsMaster = cluster.isMaster;
    originalWorkers = cluster.workers;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    cluster.isMaster = originalIsMaster;
    cluster.workers = originalWorkers;
  });

  describe('runCustom', () => {
    describe('with an invalid number of arguments', () => {
      it('should print usage and exit for zero arguments', () => {
        let exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom([], process.stdin, stdout, stderr, null, {});
        expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('usage:'));
        expect(exit).toHaveBeenCalledWith(1);
      });

      it('should print usage and exit for more than 4 arguments', () => {
        let exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['a', 'b', 'c', 'd', 'e'], process.stdin, stdout, stderr, null, {});
        expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('usage:'));
        expect(exit).toHaveBeenCalledWith(1);
      });

      it('should print usage and exit for --help', () => {
        let exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['--help'], process.stdin, stdout, stderr, null, {});
        expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('usage:'));
        expect(exit).toHaveBeenCalledWith(1);
      });

      it('should print usage and exit for -h', () => {
        let exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['-h'], process.stdin, stdout, stderr, null, {});
        expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('usage:'));
        expect(exit).toHaveBeenCalledWith(1);
      });
    });

    describe('when the component definition fails to build', () => {
      it('should report the error and exit', () => new Promise((done) => {
        let exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
        let error = new Error('bad config');
        vi.spyOn(ComponentsManager, 'build').mockReturnValue(Promise.reject(error));
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          expect(stderr.write).toHaveBeenCalledWith('Component definition error:\n');
          expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining(error.stack));
          expect(exit).toHaveBeenCalledWith(1);
          done();
        });
      }));
    });

    describe('when instantiation fails', () => {
      it('should report the error and exit', () => new Promise((done) => {
        let exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
        let error = new Error('bad instantiation');
        let manager = { instantiate: () => Promise.reject(error) };
        vi.spyOn(ComponentsManager, 'build').mockReturnValue(Promise.resolve(manager));
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(stderr.write).toHaveBeenCalledWith('Instantiation error:\n');
            expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining(error.stack));
            expect(exit).toHaveBeenCalledWith(1);
            done();
          });
        });
      }));
    });

    describe('when running as a cluster worker', () => {
      it('should run the worker with the given port', () => new Promise((done) => {
        cluster.isMaster = false;
        let worker = { run: vi.fn(), _config: {} };
        let manager = { instantiate: () => Promise.resolve(worker) };
        vi.spyOn(ComponentsManager, 'build').mockReturnValue(Promise.resolve(manager));
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json', '3000'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(worker.run).toHaveBeenCalledWith(3000);
            done();
          });
        });
      }));
    });

    describe('when running as the cluster master', () => {
      let fork, on, once;
      beforeEach(() => {
        fork = vi.spyOn(cluster, 'fork').mockImplementation(() => Object.assign(new EventEmitter(), { process: { pid: fork.mock.calls.length + 8000 }, kill: vi.fn() }));
        on = vi.spyOn(cluster, 'on').mockImplementation(() => {});
        once = vi.spyOn(process, 'once').mockImplementation(() => {});
        // Stubbed only to prevent real signal-listener registration during these tests.
        vi.spyOn(process, 'addListener').mockImplementation(() => {});
        vi.spyOn(process, 'removeListener').mockImplementation(() => {});
      });

      function build(config, extraProps) {
        let worker = Object.assign({ run: vi.fn(), _config: config }, extraProps);
        let manager = { instantiate: () => Promise.resolve(worker) };
        vi.spyOn(ComponentsManager, 'build').mockImplementation((options) => {
          options.configLoader({ register: vi.fn() });
          return Promise.resolve(manager);
        });
        return worker;
      }

      it('should fork one worker by default and announce the master', () => new Promise((done) => {
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Master ' + process.pid + ' running.'));
            expect(fork).toHaveBeenCalledTimes(1);
            done();
          });
        });
      }));

      it('should fork as many workers as configured', () => new Promise((done) => {
        build({ workers: 3 });
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(fork).toHaveBeenCalledTimes(3);
            done();
          });
        });
      }));

      it('should register a listening handler that respawns a worker that crashed unexpectedly', () => new Promise((done) => {
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(on).toHaveBeenCalledWith('listening', expect.any(Function));
            let listeningHandler = on.mock.calls.find((args) => args[0] === 'listening')[1];
            let crashedWorker = Object.assign(new EventEmitter(), { process: { pid: 999 }, exitedAfterDisconnect: false });
            listeningHandler(crashedWorker);
            crashedWorker.emit('exit', 1, null);
            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('died with 1'));
            expect(fork).toHaveBeenCalledTimes(2);
            done();
          });
        });
      }));

      it('should report the signal when a crashed worker has no exit code', () => new Promise((done) => {
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let listeningHandler = on.mock.calls.find((args) => args[0] === 'listening')[1];
            let crashedWorker = Object.assign(new EventEmitter(), { process: { pid: 999 }, exitedAfterDisconnect: false });
            listeningHandler(crashedWorker);
            crashedWorker.emit('exit', null, 'SIGKILL');
            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('died with SIGKILL'));
            done();
          });
        });
      }));

      it('should not respawn a worker that disconnected intentionally', () => new Promise((done) => {
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let listeningHandler = on.mock.calls.find((args) => args[0] === 'listening')[1];
            let disconnectedWorker = Object.assign(new EventEmitter(), { process: { pid: 999 }, exitedAfterDisconnect: true });
            listeningHandler(disconnectedWorker);
            disconnectedWorker.emit('exit', 0, null);
            expect(fork).toHaveBeenCalledTimes(1);
            done();
          });
        });
      }));

      it('should disconnect the cluster on SIGINT', () => new Promise((done) => {
        let disconnect = vi.spyOn(cluster, 'disconnect').mockImplementation(() => {});
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(once).toHaveBeenCalledWith('SIGINT', expect.any(Function));
            let sigintHandler = once.mock.calls.find((args) => args[0] === 'SIGINT')[1];
            sigintHandler();
            expect(disconnect).toHaveBeenCalledOnce();
            done();
          });
        });
      }));

      it('should immediately report completion on SIGHUP when there are no workers left', () => new Promise((done) => {
        cluster.workers = {};
        let onSighup = vi.spyOn(process, 'on').mockImplementation(() => {});
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            expect(onSighup).toHaveBeenCalledWith('SIGHUP', expect.any(Function));
            let sighupHandler = onSighup.mock.calls.find((args) => args[0] === 'SIGHUP')[1];
            sighupHandler();
            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Respawning workers of master'));
            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Respawned all workers of master'));
            done();
          });
        });
      }));

      it('should respawn an old worker once its replacement starts listening', () => new Promise((done) => {
        let oldWorker = Object.assign(new EventEmitter(), { process: { pid: 1234 }, kill: vi.fn() });
        cluster.workers = { 1: oldWorker };
        let onSighup = vi.spyOn(process, 'on').mockImplementation(() => {});
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let sighupHandler = onSighup.mock.calls.find((args) => args[0] === 'SIGHUP')[1];
            sighupHandler();
            // The respawn loop just forked a replacement worker; grab it and
            // make it start listening, which should trigger killing the old one.
            let newWorker = fork.mock.results[fork.mock.results.length - 1].value;
            newWorker.emit('listening');
            expect(oldWorker.kill).toHaveBeenCalledOnce();
            oldWorker.emit('exit');
            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('replaces killed worker'));
            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Respawned all workers of master'));
            done();
          });
        });
      }));

      it('should kill the replacement and continue when an old worker already died on its own', () => new Promise((done) => {
        let oldWorker = Object.assign(new EventEmitter(), { process: { pid: 1234 }, kill: vi.fn() });
        cluster.workers = { 1: undefined, 2: oldWorker };
        let onSighup = vi.spyOn(process, 'on').mockImplementation(() => {});
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let sighupHandler = onSighup.mock.calls.find((args) => args[0] === 'SIGHUP')[1];
            sighupHandler();
            let firstNewWorker = fork.mock.results[fork.mock.results.length - 1].value;
            firstNewWorker.emit('listening');
            oldWorker.emit('exit');
            let secondNewWorker = fork.mock.results[fork.mock.results.length - 1].value;
            secondNewWorker.emit('listening');
            expect(secondNewWorker.kill).toHaveBeenCalledOnce();
            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Respawned all workers of master'));
            done();
          });
        });
      }));

      it('should abort respawning and restore the normal SIGHUP handler when the new worker dies before listening', () => new Promise((done) => {
        let oldWorker = Object.assign(new EventEmitter(), { process: { pid: 1234 }, kill: vi.fn() });
        cluster.workers = { 1: oldWorker };
        let onSighup = vi.spyOn(process, 'on').mockImplementation(() => {});
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let sighupHandler = onSighup.mock.calls.find((args) => args[0] === 'SIGHUP')[1];
            sighupHandler();
            let newWorker = fork.mock.results[fork.mock.results.length - 1].value;
            newWorker.exitedAfterDisconnect = false;
            newWorker.emit('exit', 1, null);

            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Respawning aborted because worker'));
            expect(oldWorker.kill).not.toHaveBeenCalled();
            // The abort restores the normal SIGHUP handler and removes the pending one.
            expect(process.addListener).toHaveBeenCalledWith('SIGHUP', sighupHandler);
            expect(process.removeListener.mock.calls.some((args) =>
              args[0] === 'SIGHUP' && args[1] !== sighupHandler)).toBe(true);
            done();
          });
        });
      }));

      it('should report the signal when the new worker dies before listening with no exit code', () => new Promise((done) => {
        let oldWorker = Object.assign(new EventEmitter(), { process: { pid: 1234 }, kill: vi.fn() });
        cluster.workers = { 1: oldWorker };
        let onSighup = vi.spyOn(process, 'on').mockImplementation(() => {});
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let sighupHandler = onSighup.mock.calls.find((args) => args[0] === 'SIGHUP')[1];
            sighupHandler();
            let newWorker = fork.mock.results[fork.mock.results.length - 1].value;
            newWorker.exitedAfterDisconnect = false;
            newWorker.emit('exit', null, 'SIGKILL');

            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('died with SIGKILL'));
            done();
          });
        });
      }));

      it('should not treat a deliberate disconnect of the new worker as an abort', () => new Promise((done) => {
        let oldWorker = Object.assign(new EventEmitter(), { process: { pid: 1234 }, kill: vi.fn() });
        cluster.workers = { 1: oldWorker };
        let onSighup = vi.spyOn(process, 'on').mockImplementation(() => {});
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let sighupHandler = onSighup.mock.calls.find((args) => args[0] === 'SIGHUP')[1];
            sighupHandler();
            let newWorker = fork.mock.results[fork.mock.results.length - 1].value;
            newWorker.exitedAfterDisconnect = true;
            newWorker.emit('exit', 0, null);

            expect(stdout.write).not.toHaveBeenCalledWith(expect.stringContaining('Respawning aborted'));
            done();
          });
        });
      }));

      it('should report that a respawn is already in progress on a second SIGHUP', () => new Promise((done) => {
        let oldWorker = Object.assign(new EventEmitter(), { process: { pid: 1234 }, kill: vi.fn() });
        cluster.workers = { 1: oldWorker };
        let onSighup = vi.spyOn(process, 'on').mockImplementation(() => {});
        build({});
        let stdout = fakeWritable(), stderr = fakeWritable();
        runCustom(['config.json'], process.stdin, stdout, stderr, null, {});
        setImmediate(() => {
          setImmediate(() => {
            let sighupHandler = onSighup.mock.calls.find((args) => args[0] === 'SIGHUP')[1];
            sighupHandler();
            // A respawn is now in progress (oldWorker hasn't been killed yet);
            // process.addListener was stubbed, so grab the respawnPending
            // function it was just handed instead of relying on a real signal.
            let pendingHandler = process.addListener.mock.calls.find((args) => args[0] === 'SIGHUP')[1];
            pendingHandler();

            expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Respawning already in progress'));
            done();
          });
        });
      }));
    });
  });

  describe('runCli', () => {
    it('should invoke runCustom with argv, standard streams, and the module root path', () => {
      let exit = vi.spyOn(process, 'exit').mockImplementation(() => {});
      let write = vi.spyOn(process.stdout, 'write').mockImplementation(() => {});
      let originalArgv = process.argv;
      process.argv = ['node', 'script.js'];
      try {
        runCli('/path/to/module');
        expect(write).toHaveBeenCalledWith(expect.stringContaining('usage:'));
        expect(exit).toHaveBeenCalledWith(1);
      }
      finally {
        write.mockRestore();
        process.argv = originalArgv;
      }
    });
  });
});
