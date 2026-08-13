/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
const sinon = require('sinon');
const Datasource = require('../../lib/datasources/Datasource').Datasource; // changed to make tests pass, will be revised in follow up pr

const EventEmitter = require('events'),
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

    it('should throw an error when trying to execute an unsupported query', () => new Promise((done) => {
      datasource.select({ features: { a: true, b: true } }, (error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toHaveProperty('message', 'The datasource does not support the given query');
        done();
      });
    }));

    it('should throw an error when trying to execute a supported query', () => {
      expect(() => { datasource.select({ features: {} }); })
        .toThrow('_executeQuery has not been implemented');
    });

    describe('fetching a resource', () => {
      it('fetches an existing resource', () => new Promise((done) => {
        let result = datasource._fetch({ url: 'file://' + exampleFile }), buffer = '';
        result.on('data', (d) => { buffer += d; });
        result.on('end', () => {
          expect(buffer).toBe(fs.readFileSync(exampleFile, 'utf8'));
          done();
        });
        result.on('error', done);
      }));

      it('assumes file:// as the default protocol', () => new Promise((done) => {
        let result = datasource._fetch({ url: exampleFile }), buffer = '';
        result.on('data', (d) => { buffer += d; });
        result.on('end', () => {
          expect(buffer).toBe(fs.readFileSync(exampleFile, 'utf8'));
          done();
        });
        result.on('error', done);
      }));

      it('emits an error when the protocol is unknown', () => new Promise((done) => {
        let result = datasource._fetch({ url: 'myprotocol:abc' });
        result.on('error', (error) => {
          expect(error.message).toContain('Unknown protocol: myprotocol');
          done();
        });
      }));

      it('emits an error on the datasource when no error listener is attached to the result', () => new Promise((done) => {
        let result = datasource._fetch({ url: exampleFile + 'notfound' });
        result.on('data', done);
        datasource.on('error', (error) => {
          expect(error.message).toContain('ENOENT: no such file or directory');
          done();
        });
      }));

      it('does not emit an error on the datasource when an error listener is attached to the result', () => new Promise((done) => {
        let result = datasource._fetch({ url: exampleFile + 'notfound' });
        result.on('error', (error) => {
          expect(error.message).toContain('ENOENT: no such file or directory');
          done();
        });
        datasource.on('error', (error) => {
          done(error);
        });
      }));

      it('fetches an http(s) resource via the configured request function', () => new Promise((done) => {
        let fakeRequest = sinon.spy(() => {
          let stream = new EventEmitter();
          setImmediate(() => {
            stream.emit('response', { statusCode: 200 });
            stream.emit('end');
          });
          return stream;
        });
        let httpDatasource = new Datasource({ dataFactory, request: fakeRequest });
        let result = httpDatasource._fetch({ url: 'http://example.org/resource' });
        expect(fakeRequest.calledOnce).toBe(true);
        result.on('end', done);
        result.on('error', done);
      }));

      it('emits an error for an http(s) response with a non-success status code', () => new Promise((done) => {
        function fakeRequest() {
          let stream = new EventEmitter();
          setImmediate(() => { stream.emit('response', { statusCode: 404 }); });
          return stream;
        }
        let httpDatasource = new Datasource({ dataFactory, request: fakeRequest });
        let result = httpDatasource._fetch({ url: 'https://example.org/missing' });
        result.on('error', (error) => {
          expect(error.message).toContain('returned 404');
          done();
        });
      }));
    });

    describe('when closed without a callback', () => {
      it('should do nothing', () => {
        datasource.close();
      });
    });

    describe('when closed with a callback', () => {
      it('should invoke the callback', () => new Promise((done) => {
        datasource.close(done);
      }));
    });
  });

  describe('A disabled Datasource instance', () => {
    let datasource = new Datasource({ dataFactory, enabled: false });

    it('should also be hidden', () => {
      expect(datasource.hide).toBe(true);
    });

    it('should initialize immediately without becoming queryable', () => new Promise((done) => {
      datasource.on('initialized', () => {
        expect(datasource.initialized).toBe(true);
        done();
      });
      datasource.initialize();
    }));
  });

  describe('A Datasource instance without quad support', () => {
    it('should not indicate support for the quadPattern feature', () => {
      let datasource = new Datasource({ dataFactory, quads: false }, ['quadPattern', 'triplePattern']);
      expect(datasource.supportedFeatures).toEqual({ triplePattern: true });
    });
  });

  describe('A Datasource instance with an initializer', () => {
    let datasource, initializedListener, errorListener, initResolver, initSpy;
    beforeAll(() => {
      datasource = new Datasource({ dataFactory });
      datasource._initialize = () => new Promise((resolve) => initResolver = resolve);
      initSpy = sinon.spy(datasource, '_initialize');
      Object.defineProperty(datasource, 'supportedFeatures', {
        value: { all: true },
      });
      datasource.on('initialized', initializedListener = sinon.stub());
      datasource.on('error', errorListener = sinon.stub());
      datasource.initialize();
    });

    describe('after construction', () => {
      it('should have called the initializer', () => {
        expect(initSpy.calledOnce).toBe(true);
      });

      it('should not be initialized', () => {
        expect(datasource.initialized).toBe(false);
      });

      it('should not support any query', () => {
        expect(datasource.supportsQuery({})).toBe(false);
      });

      it('should error when trying to query', () => new Promise((done) => {
        datasource.select({}, (error) => {
          expect(error).toHaveProperty('message', 'The datasource is not initialized yet');
          done();
        });
      }));
    });

    describe('after the initializer calls the callback', () => {
      beforeAll(() => {
        initResolver();
      });

      it('should be initialized', () => {
        expect(datasource.initialized).toBe(true);
      });

      it('should have called "initialized" listeners', () => {
        expect(initializedListener.calledOnce).toBe(true);
      });

      it('should not have called "error" listeners', () => {
        expect(errorListener.called).toBe(false);
      });

      it('should support queries', () => {
        expect(datasource.supportsQuery({})).toBe(true);
      });

      it('should allow querying', () => new Promise((done) => {
        datasource.select({}, (error) => {
          expect(error).toHaveProperty('message', '_executeQuery has not been implemented');
          done();
        });
      }));
    });
  });

  describe('A Datasource instance with an initializer that errors synchronously', () => {
    let datasource, initializedListener, errorListener, error;
    beforeAll(() => {
      datasource = new Datasource({ dataFactory });
      error = new Error('initializer error');
      datasource._initialize = () => { throw error; };
      sinon.spy(datasource, '_initialize');
      datasource.on('initialized', initializedListener = sinon.stub());
      datasource.on('error', errorListener = sinon.stub());
      datasource.initialize();
    });

    describe('after the initializer calls the callback', () => {
      it('should have called the initializer', () => {
        expect(datasource._initialize.calledOnce).toBe(true);
      });

      it('should not be initialized', () => {
        expect(datasource.initialized).toBe(false);
      });

      it('should not have called "initialized" listeners', () => {
        expect(initializedListener.called).toBe(false);
      });

      it('should not have called "error" listeners', () => {
        expect(errorListener.calledOnce).toBe(true);
        expect(errorListener.calledWith(error)).toBe(true);
      });
    });
  });

  describe('A Datasource instance with an initializer that errors asynchronously', () => {
    let datasource, initializedListener, errorListener, error;
    beforeAll(() => {
      datasource = new Datasource({ dataFactory });
      error = new Error('initializer error');
      datasource._initialize = () => Promise.reject(error);
      sinon.spy(datasource, '_initialize');
      datasource.on('initialized', initializedListener = sinon.stub());
      datasource.on('error', errorListener = sinon.stub());
      datasource.initialize();
    });

    describe('after the initializer calls the callback', () => {
      it('should have called the initializer', () => {
        expect(datasource._initialize.calledOnce).toBe(true);
      });

      it('should not be initialized', () => {
        expect(datasource.initialized).toBe(false);
      });

      it('should not have called "initialized" listeners', () => {
        expect(initializedListener.called).toBe(false);
      });

      it('should not have called "error" listeners', () => {
        expect(errorListener.calledOnce).toBe(true);
        expect(errorListener.calledWith(error)).toBe(true);
      });
    });
  });

  describe('A derived Datasource instance', () => {
    let datasource = new Datasource({ dataFactory });
    Object.defineProperty(datasource, 'supportedFeatures', {
      enumerable: true,
      value: { a: true, b: true, c: false },
    });
    datasource._executeQuery = sinon.stub();
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
      let onError = sinon.stub(), error = new Error();
      let result = datasource.select({ features: {} }, onError);
      result.emit('error', error);
      expect(onError.calledOnce).toBe(true);
      expect(onError.calledWith(error)).toBe(true);
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
    datasource._executeQuery = sinon.spy((query, destination) => {
      destination._push(dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o1')));
      destination._push(dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o2'), dataFactory.defaultGraph()));
      destination._push(dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o3'), dataFactory.namedNode('g')));
      destination.close();
    });

    beforeEach(() => {
      datasource._executeQuery.reset();
    });

    it('should move triples in the default graph to the given graph', () => new Promise((done) => {
      let result = datasource.select({ features: { custom: true } }, done), quads = [];
      result.on('data', (q) => { quads.push(q); });
      result.on('end', () => {
        let matchingquads = [
          dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o1'), dataFactory.namedNode('http://example.org/#mygraph')),
          dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o2'), dataFactory.namedNode('http://example.org/#mygraph')),
          dataFactory.quad(dataFactory.namedNode('s'), dataFactory.namedNode('p'), dataFactory.namedNode('o3'), dataFactory.namedNode('g')),
        ];
        expect(matchingquads.length).toBe(quads.length);
        for (let i = 0; i < quads.length; i++)
          expect(quads[i]).toEqual(matchingquads[i]);
        done();
      });
    }));

    it('should query the given graph as the default graph', () => {
      datasource.select({
        graph: dataFactory.namedNode('http://example.org/#mygraph'),
        features: { custom: true },
      });
      expect(datasource._executeQuery.args[0][0].features).toEqual({ custom: true }),
      datasource._executeQuery.args[0][0].graph.equals(dataFactory.defaultGraph());
    });

    it('should query the default graph as the empty graph', () => {
      datasource.select({
        graph: dataFactory.defaultGraph(),
        features: { custom: true },
      });
      expect(datasource._executeQuery.args[0][0].features).toEqual({ custom: true }),
      datasource._executeQuery.args[0][0].graph.equals(dataFactory.namedNode('urn:ldf:emptyGraph'));
    });
  });
});
