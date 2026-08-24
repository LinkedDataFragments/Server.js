/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { once } from 'events';
import { promisify } from 'util';
// vi.mock only intercepts modules loaded through Vite's transform graph, so
// this must be import()'d rather than require()'d for the mocks below to work.
import { ExternalHdtDatasource } from '../../lib/datasources/ExternalHdtDatasource';
import { Datasource } from '@ldf/core/lib/datasources/Datasource';

// Wraps the real module in a Proxy (not a `{ ...actual }` spread, which
// breaks `this` binding on native methods) so untouched methods keep working
// and individual tests can still override specific ones.
function mockModulePreservingThis(actual, overrides) {
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop in overrides) return overrides[prop];
      return Reflect.get(target, prop, target === receiver ? target : receiver);
    },
  });
}
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return mockModulePreservingThis(actual, { spawn: vi.fn(actual.spawn) });
});
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return mockModulePreservingThis(actual, { existsSync: vi.fn(actual.existsSync) });
});

let path = require('path'),
    N3 = require('n3'),
    EventEmitter = require('events').EventEmitter;

const dataFactory = N3.DataFactory;

let exampleHdtFile = path.join(__dirname, '../../../../test/assets/test.hdt');

// Creates a fake child process exposing just enough of the `child_process.ChildProcess`
// API for ExternalHdtDatasource's `_executeQuery`: a `stdout` stream to push data through.
function fakeHdtProcess() {
  let proc = new EventEmitter();
  proc.stdout = Object.assign(new EventEmitter(), { setEncoding: () => {} });
  return proc;
}

describe('ExternalHdtDatasource', () => {
  describe('The ExternalHdtDatasource module', () => {
    it('should be a function', () => {
      expect(typeof ExternalHdtDatasource).toBe('function');
    });

    it('should be an ExternalHdtDatasource constructor', async () => {
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      expect(instance).toBeInstanceOf(ExternalHdtDatasource);
      await promisify(instance.close.bind(instance))();
    });

    it('should create Datasource objects', async () => {
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      expect(instance).toBeInstanceOf(Datasource);
      await promisify(instance.close.bind(instance))();
    });

    it('should not throw when constructed without options', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new ExternalHdtDatasource();
      }).not.toThrow();
    });
  });

  describe('created for a non-existing file', () => {
    it('should fail to initialize', async () => {
      let instance = new ExternalHdtDatasource({ dataFactory, file: '/no/such/file.hdt' });
      let errorEvent = once(instance, 'error');
      instance.initialize();
      let [error] = await errorEvent;
      expect(error.message).toContain('Not an HDT file');
    });
  });

  describe('created for an existing file when the hdt utility is missing', () => {
    it('should fail to initialize', async () => {
      vi.mocked(existsSync).mockImplementation((path) => path === exampleHdtFile);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile });
      let errorEvent = once(instance, 'error');
      instance.initialize();
      let [error] = await errorEvent;
      expect(error.message).toContain('hdt not found');
      vi.mocked(existsSync).mockRestore();
    });
  });

  describe('_executeQuery with a stubbed hdt process', () => {
    it('should emit an error when the hdt utility outputs invalid query results', async () => {
      let proc = fakeHdtProcess();
      vi.mocked(spawn).mockReturnValueOnce(proc);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile, checkFile: false });
      instance.initialize();
      await once(instance, 'initialized');
      let result = instance.select({ features: { triplePattern: true } });
      let errorEvent = once(result, 'error');
      // Malformed: a subject and predicate with no object before the period
      proc.stdout.emit('data', '<http://example.org/s> <http://example.org/p> .\n');
      let [error] = await errorEvent;
      expect(error.message).toContain('Invalid query result');
    });

    it('should round the estimated total count up when the header undercounts the offset and page', async () => {
      let proc = fakeHdtProcess();
      vi.mocked(spawn).mockReturnValueOnce(proc);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile, checkFile: false });
      instance.initialize();
      await once(instance, 'initialized');
      let result = instance.select({ offset: 0, limit: 10, features: { triplePattern: true, offset: true, limit: true } });
      let resultsCount = 0, totalCount;
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', () => { resultsCount++; });
      let ended = once(result, 'end');
      // Header underestimates: claims 1 total match, but 2 triples are actually returned
      proc.stdout.emit('data', '# Total matches: 1 (estimated)\n' +
        '<http://example.org/s> <http://example.org/p> <http://example.org/o1> .\n' +
        '<http://example.org/s> <http://example.org/p> <http://example.org/o2> .\n');
      proc.stdout.emit('end');
      await ended;
      expect(resultsCount).toBe(2);
      expect(totalCount).toBe(2);
    });

    it('should double the returned triple count when it fills the whole page', async () => {
      let proc = fakeHdtProcess();
      vi.mocked(spawn).mockReturnValueOnce(proc);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile, checkFile: false });
      instance.initialize();
      await once(instance, 'initialized');
      let result = instance.select({ offset: 0, limit: 1, features: { triplePattern: true, offset: true, limit: true } });
      let totalCount;
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', () => {});
      let ended = once(result, 'end');
      // Header underestimates, and the page is full (2 triples reaches the limit of 1... simulated as 2 for doubling)
      proc.stdout.emit('data', '# Total matches: 1 (estimated)\n' +
        '<http://example.org/s> <http://example.org/p> <http://example.org/o1> .\n' +
        '<http://example.org/s> <http://example.org/p> <http://example.org/o2> .\n');
      proc.stdout.emit('end');
      await ended;
      expect(totalCount).toBe(4);
    });

    it('should emit an error when the hdt utility process exits with a non-zero code', async () => {
      let proc = fakeHdtProcess();
      vi.mocked(spawn).mockReturnValueOnce(proc);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile, checkFile: false });
      instance.initialize();
      await once(instance, 'initialized');
      let result = instance.select({ features: { triplePattern: true } });
      let errorEvent = once(result, 'error');
      proc.emit('exit', 1);
      let [error] = await errorEvent;
      expect(error.message).toContain('Could not query');
    });
  });

  describe('created for a non-existing file with checkFile disabled', () => {
    it('should initialize without checking the file', async () => {
      let instance = new ExternalHdtDatasource({ dataFactory, file: '/no/such/file.hdt', checkFile: false });
      let initialized = once(instance, 'initialized');
      instance.initialize();
      await initialized;
    });
  });

  describe('A ExternalHdtDatasource instance for an example HDT file', () => {
    let datasource;
    beforeAll(async () => {
      datasource = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile });
      datasource.initialize();
      await once(datasource, 'initialized');
    });
    afterAll(() => promisify(datasource.close.bind(datasource))());

    describe('executing the empty query', () => {
      let resultsCount = 0, totalCount;
      beforeAll(async () => {
        let result = datasource.select({ features: { triplePattern: true } });
        result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
        result.on('data', () => { resultsCount++; });
        await once(result, 'end');
      });

      it('should return all triples in the file', () => {
        expect(resultsCount).toBe(132);
      });

      it('should emit the total triple count', () => {
        expect(totalCount).toBe(132);
      });
    });

    describe('executing the empty query with an offset and limit', () => {
      let resultsCount = 0;
      beforeAll(async () => {
        let result = datasource.select({ offset: 10, limit: 10, features: { triplePattern: true, offset: true, limit: true } });
        result.on('data', () => { resultsCount++; });
        await once(result, 'end');
      });

      it('should return the requested number of triples', () => {
        expect(resultsCount).toBe(10);
      });
    });

    describe('executing a query for a non-default graph', () => {
      let resultsCount = 0, totalCount;
      beforeAll(async () => {
        let result = datasource.select({ graph: dataFactory.namedNode('g'), features: { quadPattern: true } });
        result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
        result.on('data', () => { resultsCount++; });
        await once(result, 'end');
      });

      it('should return no triples, since HDT only has a default graph', () => {
        expect(resultsCount).toBe(0);
        expect(totalCount).toBe(0);
      });
    });

    // TODO: the query string passed to the `hdt` CLI is built through plain
    // string concatenation (`query.subject || '?s'`), but a Term's default
    // toString() is "[object Object]", not its IRI, so any subject/predicate/
    // object filter currently matches nothing.
    describe('executing a query with a subject filter', () => {
      let resultsCount = 0;
      beforeAll(async () => {
        let result = datasource.select({
          subject: dataFactory.namedNode('http://example.org/s1'),
          features: { triplePattern: true },
        });
        result.on('data', () => { resultsCount++; });
        await once(result, 'end');
      });

      it('currently returns no triples, even though the subject exists in the file', () => {
        expect(resultsCount).toBe(0);
      });
    });
  });
});
