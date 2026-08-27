/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { withResolvers } from '../../../../test/test-helpers';
const Datasource = require('../../lib/datasources/Datasource').Datasource; // changed to make tests pass, will be revised in follow up pr

const EventEmitter = require('events'),
    { once } = EventEmitter,
    fs = require('fs'),
    path = require('path'),
    N3 = require('n3');

const exampleFile = path.join(__dirname, '../../../../test/assets/test.ttl');
const dataFactory = N3.DataFactory;

describe('Datasource', () => {
  describe('The Datasource module', () => {
    it('should be a function', () => {
      expect(typeof Datasource).toBe('function');
    });

    it('should be a Datasource constructor', () => {
      expect(new Datasource({ dataFactory })).toBeInstanceOf(Datasource);
    });

    it('should be an EventEmitter constructor', () => {
      expect(new Datasource({ dataFactory })).toBeInstanceOf(EventEmitter);
    });
  });

  describe('A Datasource instance', () => {
    let datasource = new Datasource({ dataFactory });
    datasource.initialize();

    it('should not indicate support for any features', () => {
      expect(datasource.supportedFeatures).toEqual({});
    });

    it('should not support the empty query', () => {
      expect(datasource.supportsQuery({})).toBe(false);
    });

    it('should not support a query with features', () => {
      expect(datasource.supportsQuery({ features: { a: true, b: true } })).toBe(false);
    });

    it('should throw an error when trying to execute an unsupported query', async () => {
      let error = await new Promise((resolve) => datasource.select({ features: { a: true, b: true } }, resolve));
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty('message', 'The datasource does not support the given query');
    });

    it('should throw an error when trying to execute a supported query', () => {
      expect(() => { datasource.select({ features: {} }); })
        .toThrow('_executeQuery has not been implemented');
    });

    describe('fetching a resource', () => {
      it('fetches an existing resource', async () => {
        let result = datasource._fetch({ url: 'file://' + exampleFile }), buffer = '';
        result.on('data', (d) => { buffer += d; });
        await once(result, 'end');
        expect(buffer).toBe(fs.readFileSync(exampleFile, 'utf8'));
      });

      it('assumes file:// as the default protocol', async () => {
        let result = datasource._fetch({ url: exampleFile }), buffer = '';
        result.on('data', (d) => { buffer += d; });
        await once(result, 'end');
        expect(buffer).toBe(fs.readFileSync(exampleFile, 'utf8'));
      });

      it('emits an error when the protocol is unknown', async () => {
        let result = datasource._fetch({ url: 'myprotocol:abc' });
        let [error] = await once(result, 'error');
        expect(error.message).toContain('Unknown protocol: myprotocol');
      });

      it('emits an error on the datasource when no error listener is attached to the result', async () => {
        let result = datasource._fetch({ url: exampleFile + 'notfound' });
        result.on('data', () => {});
        let [error] = await once(datasource, 'error');
        expect(error.message).toContain('ENOENT: no such file or directory');
      });

      it('does not emit an error on the datasource when an error listener is attached to the result', async () => {
        let result = datasource._fetch({ url: exampleFile + 'notfound' });
        let datasourceErrorListener = vi.fn();
        datasource.on('error', datasourceErrorListener);
        let [error] = await once(result, 'error');
        expect(error.message).toContain('ENOENT: no such file or directory');
        expect(datasourceErrorListener).not.toHaveBeenCalled();
      });
    });

    describe('when closed without a callback', () => {
      it('should do nothing', () => {
        datasource.close();
      });
    });

    describe('when closed with a callback', () => {
      it('should invoke the callback', () => new Promise((resolve) => datasource.close(resolve)));
    });
  });

  describe('A Datasource instance with an initializer', () => {
    let datasource, initializedListener, errorListener, initResolver, initSpy;
    beforeAll(() => {
      datasource = new Datasource({ dataFactory });
      datasource._initialize = () => {
        let { promise, resolve } = withResolvers();
        initResolver = resolve;
        return promise;
      };
      initSpy = vi.spyOn(datasource, '_initialize');
      Object.defineProperty(datasource, 'supportedFeatures', {
        value: { all: true },
      });
      datasource.on('initialized', initializedListener = vi.fn());
      datasource.on('error', errorListener = vi.fn());
      datasource.initialize();
    });

    describe('after construction', () => {
      it('should have called the initializer', () => {
        expect(initSpy).toHaveBeenCalledOnce();
      });

      it('should not be initialized', () => {
        expect(datasource.initialized).toBe(false);
      });

      it('should not support any query', () => {
        expect(datasource.supportsQuery({})).toBe(false);
      });

      it('should error when trying to query', async () => {
        let error = await new Promise((resolve) => datasource.select({}, resolve));
        expect(error).toHaveProperty('message', 'The datasource is not initialized yet');
      });
    });

    describe('after the initializer calls the callback', () => {
      beforeAll(() => {
        initResolver();
      });

      it('should be initialized', () => {
        expect(datasource.initialized).toBe(true);
      });

      it('should have called "initialized" listeners', () => {
        expect(initializedListener).toHaveBeenCalledOnce();
      });

      it('should not have called "error" listeners', () => {
        expect(errorListener).not.toHaveBeenCalled();
      });

      it('should support queries', () => {
        expect(datasource.supportsQuery({})).toBe(true);
      });

      it('should allow querying', async () => {
        let error = await new Promise((resolve) => datasource.select({}, resolve));
        expect(error).toHaveProperty('message', '_executeQuery has not been implemented');
      });
    });
  });

  describe('A Datasource instance with an initializer that errors synchronously', () => {
    let datasource, initializedListener, errorListener, error;
    beforeAll(() => {
      datasource = new Datasource({ dataFactory });
      error = new Error('initializer error');
      datasource._initialize = () => { throw error; };
      vi.spyOn(datasource, '_initialize');
      datasource.on('initialized', initializedListener = vi.fn());
      datasource.on('error', errorListener = vi.fn());
      datasource.initialize();
    });

    describe('after the initializer calls the callback', () => {
      it('should have called the initializer', () => {
        expect(datasource._initialize).toHaveBeenCalledOnce();
      });

      it('should not be initialized', () => {
        expect(datasource.initialized).toBe(false);
      });

      it('should not have called "initialized" listeners', () => {
        expect(initializedListener).not.toHaveBeenCalled();
      });

      it('should not have called "error" listeners', () => {
        expect(errorListener).toHaveBeenCalledOnce();
        expect(errorListener).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('A Datasource instance with an initializer that errors asynchronously', () => {
    let datasource, initializedListener, errorListener, error;
    beforeAll(() => {
      datasource = new Datasource({ dataFactory });
      error = new Error('initializer error');
      datasource._initialize = () => Promise.reject(error);
      vi.spyOn(datasource, '_initialize');
      datasource.on('initialized', initializedListener = vi.fn());
      datasource.on('error', errorListener = vi.fn());
      datasource.initialize();
    });

    describe('after the initializer calls the callback', () => {
      it('should have called the initializer', () => {
        expect(datasource._initialize).toHaveBeenCalledOnce();
      });

      it('should not be initialized', () => {
        expect(datasource.initialized).toBe(false);
      });

      it('should not have called "initialized" listeners', () => {
        expect(initializedListener).not.toHaveBeenCalled();
      });

      it('should not have called "error" listeners', () => {
        expect(errorListener).toHaveBeenCalledOnce();
        expect(errorListener).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('A derived Datasource instance', () => {
    let datasource = new Datasource({ dataFactory });
    Object.defineProperty(datasource, 'supportedFeatures', {
      enumerable: true,
      value: { a: true, b: true, c: false },
    });
    datasource._executeQuery = vi.fn();
    datasource.initialize();

    it('should support the empty query', () => {
      expect(datasource.supportsQuery({})).toBe(true);
    });

    it('should support queries with supported features', () => {
      expect(datasource.supportsQuery({ features: {} })).toBe(true);
      expect(datasource.supportsQuery({ features: { a: true } })).toBe(true);
      expect(datasource.supportsQuery({ features: { a: true, b: true } })).toBe(true);
      expect(datasource.supportsQuery({ features: { b: true } })).toBe(true);
      expect(datasource.supportsQuery({ features: { a: false, b: true } })).toBe(true);
      expect(datasource.supportsQuery({ features: { a: true, b: false } })).toBe(true);
      expect(datasource.supportsQuery({ features: { a: true, b: true, c: false } })).toBe(true);
    });

    it('should not support queries with unsupported features', () => {
      expect(datasource.supportsQuery({ features: { c: true } })).toBe(false);
      expect(datasource.supportsQuery({ features: { a: true, c: true } })).toBe(false);
      expect(datasource.supportsQuery({ features: { b: true, c: true } })).toBe(false);
      expect(datasource.supportsQuery({ features: { a: true, b: true, c: true } })).toBe(false);
    });

    it('should not attach an error listener on select if none was passed', () => {
      let result = datasource.select({ features: {} });
      expect(() => { result.emit('error', new Error()); }).toThrow();
    });

    it('should attach an error listener on select if one was passed', () => {
      let onError = vi.fn(), error = new Error();
      let result = datasource.select({ features: {} }, onError);
      result.emit('error', error);
      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('A Datasource instance with a graph property', () => {
    let datasource = new Datasource({
      dataFactory,
      graph: 'http://example.org/#mygraph',
    });
    Object.defineProperty(datasource, 'supportedFeatures', {
      enumerable: true,
      value: { custom: true },
    });
    datasource.initialize();
    datasource._executeQuery = vi.fn((query, destination) => {
      destination._push(dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o1')));
      destination._push(dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o2'), dataFactory.defaultGraph()));
      destination._push(dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o3'), dataFactory.namedNode('g')));
      destination.close();
    });

    beforeEach(() => {
      datasource._executeQuery.mockClear();
    });

    it('should move triples in the default graph to the given graph', async () => {
      let { promise, reject } = withResolvers();
      let result = datasource.select({ features: { custom: true } }, reject), quads = [];
      result.on('data', (q) => { quads.push(q); });
      await Promise.race([once(result, 'end'), promise]);
      let matchingquads = [
        dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o1'), dataFactory.namedNode('http://example.org/#mygraph')),
        dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o2'), dataFactory.namedNode('http://example.org/#mygraph')),
        dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o3'), dataFactory.namedNode('g')),
      ];
      expect(matchingquads.length).toBe(quads.length);
      for (let i = 0; i < quads.length; i++)
        expect(quads[i]).toEqual(matchingquads[i]);
    });

    it('should query the given graph as the default graph', () => {
      datasource.select({
        graph: dataFactory.namedNode('http://example.org/#mygraph'),
        features: { custom: true },
      });
      expect(datasource._executeQuery.mock.calls[0][0].features).toEqual({ custom: true }),
      datasource._executeQuery.mock.calls[0][0].graph.equals(dataFactory.defaultGraph());
    });

    it('should query the default graph as the empty graph', () => {
      datasource.select({
        graph: dataFactory.defaultGraph(),
        features: { custom: true },
      });
      expect(datasource._executeQuery.mock.calls[0][0].features).toEqual({ custom: true }),
      datasource._executeQuery.mock.calls[0][0].graph.equals(dataFactory.namedNode('urn:ldf:emptyGraph'));
    });
  });
});
