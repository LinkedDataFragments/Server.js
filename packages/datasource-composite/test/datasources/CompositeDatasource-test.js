/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
let CompositeDatasource = require('../../').datasources.CompositeDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    HdtDatasource = require('@ldf/datasource-hdt').datasources.HdtDatasource,
    N3Datasource = require('@ldf/datasource-n3').datasources.N3Datasource,
    path = require('path'),
    dataFactory = require('n3').DataFactory;

let EventEmitter = require('events'),
    { once } = EventEmitter,
    { promisify } = require('util');

let exampleHdtFile = path.join(__dirname, '../../../../test/assets/test.hdt');
let exampleHdtFileWithBlanks = path.join(__dirname, '../../../../test/assets/test-blank.hdt');
let exampleTurtleUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.ttl');
let exampleTrigUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.trig');

// A lightweight stand-in for a Datasource, for exercising CompositeDatasource
// edge cases (large/inexact counts, graph mismatches) that would be
// impractical to set up with real HDT/N3 fixture files.
function fakeQuads(count) {
  let quads = [];
  for (let i = 0; i < count; i++) quads.push({});
  return quads;
}
function fakeDatasource(options) {
  options = options || {};
  let quads = options.quads || [];
  return {
    enabled: options.enabled,
    _graph: options.graph,
    supportedFeatures: options.supportedFeatures || { triplePattern: true, quadPattern: true, limit: true, offset: true, totalCount: true },
    supportsQuery: () => options.supportsQuery !== false,
    select: vi.fn(() => {
      let iterator = new EventEmitter();
      // Mocks AsyncIterator's own getProperty(name, callback) signature.
      /* eslint-disable promise/prefer-await-to-callbacks */
      iterator.getProperty = (name, callback) => {
        if (name === 'metadata')
          callback({ totalCount: quads.length, hasExactCount: options.hasExactCount !== false });
      };
      /* eslint-enable promise/prefer-await-to-callbacks */
      setImmediate(() => {
        quads.forEach((quad) => iterator.emit('data', quad));
        iterator.emit('end');
      });
      return iterator;
    }),
  };
}

describe('CompositeDatasource', () => {
  let references = {
    data0: { dataFactory, settings: { dataFactory, file: exampleHdtFile }, datasourceType: HdtDatasource, size: 132 },
    data1: { dataFactory, settings: { dataFactory, file: exampleHdtFileWithBlanks, graph: 'http://example.org/graph0' }, datasourceType: HdtDatasource, size: 6 },
    data2: { dataFactory, settings: { dataFactory, url: exampleTurtleUrl }, datasourceType: N3Datasource, size: 129 },
    data3: { dataFactory, settings: { dataFactory, url: exampleTrigUrl }, datasourceType: N3Datasource, size: 7 },
  };
  Object.keys(references).forEach((datasourceId) => {
    let datasource = references[datasourceId];
    let DatasourceType = datasource.datasourceType;
    let size = references[datasourceId].size;
    references[datasourceId] = new DatasourceType(datasource.settings);
    references[datasourceId].size = size;
  });
  let totalSize = Object.keys(references).reduce((acc, key) => {
    return acc + references[key].size;
  }, 0);

  beforeAll(() => Promise.all(Object.keys(references).map(async (key) => {
    references[key].initialize();
    await once(references[key], 'initialized');
  })));

  describe('The CompositeDatasource module', () => {
    it('should be a function', () => {
      expect(typeof CompositeDatasource).toBe('function');
    });

    it('should be an CompositeDatasource constructor', async () => {
      let instance = new CompositeDatasource({ references: references, dataFactory });
      expect(instance).toBeInstanceOf(CompositeDatasource);
      await promisify(instance.close.bind(instance))();
    });

    it('should create CompositeDatasource objects', async () => {
      let instance = new CompositeDatasource({ references: references, dataFactory });
      expect(instance).toBeInstanceOf(CompositeDatasource);
      await promisify(instance.close.bind(instance))();
    });

    it('should create Datasource objects', async () => {
      let instance = new CompositeDatasource({ references: references, dataFactory });
      expect(instance).toBeInstanceOf(Datasource);
      await promisify(instance.close.bind(instance))();
    });
  });

  describe('A CompositeDatasource instance for 4 Datasources', () => {
    let datasource;
    function getDatasource() { return datasource; }
    beforeAll(async () => {
      datasource = new CompositeDatasource({ references: references, dataFactory });
      datasource.initialize();
      await once(datasource, 'initialized');
    });
    afterAll(() => promisify(datasource.close.bind(datasource))());

    itShouldExecute(getDatasource,
      'the empty query',
      { features: { triplePattern: true } },
      totalSize, totalSize);

    itShouldExecute(getDatasource,
      'the empty quad query',
      { features: { quadPattern: true } },
      totalSize, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 10',
      { offset: 10, features: { triplePattern: true, offset: true } },
      totalSize - 10, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 100',
      { offset: 100, features: { triplePattern: true, offset: true } },
      totalSize - 100, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 200',
      { offset: 200, features: { triplePattern: true, offset: true } },
      totalSize - 200, totalSize);

    itShouldExecute(getDatasource,
      'a query for an existing subject',
      { subject: dataFactory.namedNode('http://example.org/s1'),   limit: 10, features: { triplePattern: true, limit: true } },
      10, 200);

    itShouldExecute(getDatasource,
      'a query for a non-existing subject',
      { subject: dataFactory.namedNode('http://example.org/p1'),   limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/p1'), limit: 10, features: { triplePattern: true, limit: true } },
      10, 220);

    itShouldExecute(getDatasource,
      'a query for a non-existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/s1'), limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing object',
      { object: dataFactory.namedNode('http://example.org/o001'),  limit: 10, features: { triplePattern: true, limit: true } },
      6, 6);

    itShouldExecute(getDatasource,
      'a query for a non-existing object',
      { object: dataFactory.namedNode('http://example.org/s1'),    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing graph',
      { graph: dataFactory.namedNode('http://example.org/bob'),    limit: 10, features: { quadPattern: true, limit: true } },
      3, 3);

    itShouldExecute(getDatasource,
      'a query for a non-existing graph',
      { graph: dataFactory.namedNode('http://example.org/notbob'), limit: 10, features: { quadPattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for the default graph',
      { graph: dataFactory.defaultGraph(),                          limit: 10, features: { quadPattern: true, limit: true } },
      10, 263);

    itShouldExecute(getDatasource,
      'a query for the default graph without a limit',
      { graph: dataFactory.defaultGraph(),                          features: { quadPattern: true, limit: true } },
      263, 263);

    itShouldExecute(getDatasource,
      'a query for graph0',
      { graph: dataFactory.namedNode('http://example.org/graph0'), limit: 10, features: { quadPattern: true, limit: true } },
      6, 6);
  });

  describe('constructing a CompositeDatasource', () => {
    it('should throw without a references option', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new CompositeDatasource({ dataFactory });
      }).toThrow('A CompositeDatasource requires a `references` array of datasource id\'s in its settings.');
    });

    it('should throw when a referenced datasource is missing', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new CompositeDatasource({ dataFactory, references: { a: null } });
      }).toThrow('No datasource a could be found!');
    });

    it('should exclude disabled datasources', async () => {
      let a = fakeDatasource({ enabled: false }), b = fakeDatasource({});
      let instance = new CompositeDatasource({ dataFactory, references: { a, b } });
      expect(instance._datasourceNames).toEqual(['b']);
      await promisify(instance.close.bind(instance))();
    });
  });

  describe('supportsQuery', () => {
    it('should return false when no referenced datasource supports the query', () => {
      let a = fakeDatasource({ supportsQuery: false });
      let instance = new CompositeDatasource({ dataFactory, references: { a } });
      expect(instance.supportsQuery({ features: {} })).toBe(false);
    });
  });

  describe('A CompositeDatasource with datasources in different graphs', () => {
    let graphA = dataFactory.namedNode('http://example.org/graphA'),
        graphB = dataFactory.namedNode('http://example.org/graphB');

    it('should skip a non-matching datasource when choosing where to start', async () => {
      let a = fakeDatasource({ quads: fakeQuads(2), graph: graphA, supportedFeatures: { triplePattern: true } }),
          b = fakeDatasource({ quads: fakeQuads(3), graph: graphB, supportedFeatures: { triplePattern: true, quadPattern: true } });
      let instance = new CompositeDatasource({ dataFactory, references: { a, b } });
      instance.initialize();
      await once(instance, 'initialized');
      let results = [];
      let stream = instance.select({ graph: graphB, features: { quadPattern: true } });
      stream.on('data', (quad) => results.push(quad));
      await once(stream, 'end');
      expect(results.length).toBe(3);
      expect(a.select).not.toHaveBeenCalled();
    });

    it('should stop instead of continuing into a non-matching datasource', async () => {
      // b is registered first so it is immediately chosen as the starting
      // datasource; a is only considered when trying to continue past it,
      // which is where the graph-mismatch check needs to reject it.
      let a = fakeDatasource({ quads: fakeQuads(2), graph: graphA, supportedFeatures: { triplePattern: true } }),
          b = fakeDatasource({ quads: fakeQuads(3), graph: graphB, supportedFeatures: { triplePattern: true, quadPattern: true } });
      let instance = new CompositeDatasource({ dataFactory, references: { b, a } });
      instance.initialize();
      await once(instance, 'initialized');
      let results = [];
      let stream = instance.select({ graph: graphB, limit: 10, features: { quadPattern: true, limit: true } });
      stream.on('data', (quad) => results.push(quad));
      await once(stream, 'end');
      expect(results.length).toBe(3);
      expect(a.select).not.toHaveBeenCalled();
    });
  });

  describe('A CompositeDatasource needing an exact count', () => {
    let a, instance, query;
    beforeAll(async () => {
      a = fakeDatasource({ quads: fakeQuads(1001), hasExactCount: false });
      instance = new CompositeDatasource({ dataFactory, references: { a } });
      instance.initialize();
      await once(instance, 'initialized');
      query = { offset: 1, limit: 10, features: { triplePattern: true, offset: true, limit: true } };
    });

    it('should compute an exact count when the inexact metadata is not enough', async () => {
      let stream = instance.select(query), totalCount;
      stream.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      stream.on('data', () => {});
      await once(stream, 'end');
      expect(totalCount).toBe(1001);
    });

    it('should use the cached exact count on a repeated identical query', async () => {
      let selectCallsBefore = a.select.mock.calls.length;
      let stream = instance.select(query), totalCount;
      stream.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      stream.on('data', () => {});
      await once(stream, 'end');
      expect(totalCount).toBe(1001);
      // Metadata check + final fetch, but no extra manual-count select this time
      expect(a.select.mock.calls.length).toBe(selectCallsBefore + 2);
    });
  });

  describe('A CompositeDatasource with a manually-computed count of 1000 or fewer', () => {
    let a, instance, query;
    beforeAll(async () => {
      a = fakeDatasource({ quads: fakeQuads(5), hasExactCount: false });
      instance = new CompositeDatasource({ dataFactory, references: { a } });
      instance.initialize();
      await once(instance, 'initialized');
      query = { offset: 1, limit: 10, features: { triplePattern: true, offset: true, limit: true } };
    });

    it('should recompute the exact count on every repeated query, since it is never cached', async () => {
      let selectCallsBefore = a.select.mock.calls.length;
      let stream = instance.select(query), totalCount;
      stream.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      stream.on('data', () => {});
      await once(stream, 'end');
      expect(totalCount).toBe(5);
      // Metadata check + manual-count select + final fetch, every time
      expect(a.select.mock.calls.length).toBe(selectCallsBefore + 3);
    });
  });

  describe('_executeQuery pushing a falsy result element', () => {
    it('should not count a falsy element, but still forward it to the destination', async () => {
      let a = fakeDatasource({ quads: [null, {}] });
      let instance = new CompositeDatasource({ dataFactory, references: { a } });
      instance.initialize();
      await once(instance, 'initialized');
      let pushed = [];
      let { promise, resolve } = Promise.withResolvers();
      let destination = {
        setProperty: () => {},
        _push: (element) => pushed.push(element),
        close: resolve,
      };
      instance._executeQuery({ offset: 0, limit: 10 }, destination);
      await promise;
      expect(pushed).toEqual([null, {}]);
    });
  });
});

function itShouldExecute(getDatasource, name, query,
  expectedResultsCount, expectedTotalCount, expectedTriples) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount, triples = [];
    beforeAll(async () => {
      let result = getDatasource().select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', (triple) => { resultsCount++; expectedTriples && triples.push(triple); });
      await once(result, 'end');
    });

    it('should return the expected number of triples', () => {
      expect(resultsCount).toBe(expectedResultsCount);
    });

    it('should emit the expected total number of triples', () => {
      expect(totalCount).toBe(expectedTotalCount);
    });

    if (expectedTriples) {
      it('should emit the expected triples', () => {
        expect(triples.length).toBe(expectedTriples.length);
        for (let i = 0; i < expectedTriples.length; i++)
          expect(triples[i]).toEqual(expectedTriples[i]);
      });
    }
  });
}
