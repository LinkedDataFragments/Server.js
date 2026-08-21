/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
let CompositeDatasource = require('../../').datasources.CompositeDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    HdtDatasource = require('@ldf/datasource-hdt').datasources.HdtDatasource,
    N3Datasource = require('@ldf/datasource-n3').datasources.N3Datasource,
    path = require('path'),
    dataFactory = require('n3').DataFactory;

let sinon = require('sinon'),
    EventEmitter = require('events');

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
    select: sinon.spy(() => {
      let iterator = new EventEmitter();
      iterator.getProperty = (name, callback) => {
        if (name === 'metadata')
          callback({ totalCount: quads.length, hasExactCount: options.hasExactCount !== false });
      };
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

  beforeAll(() => Promise.all(Object.keys(references).map((key) => new Promise((resolve) => {
    references[key].initialize();
    references[key].on('initialized', resolve);
  }))));

  describe('The CompositeDatasource module', () => {
    it('should be a function', () => {
      expect(typeof CompositeDatasource).toBe('function');
    });

    it('should be an CompositeDatasource constructor', () => new Promise((done) => {
      let instance = new CompositeDatasource({ references: references, dataFactory });
      expect(instance).toBeInstanceOf(CompositeDatasource);
      instance.close(done);
    }));

    it('should create CompositeDatasource objects', () => new Promise((done) => {
      let instance = new CompositeDatasource({ references: references, dataFactory });
      expect(instance).toBeInstanceOf(CompositeDatasource);
      instance.close(done);
    }));

    it('should create Datasource objects', () => new Promise((done) => {
      let instance = new CompositeDatasource({ references: references, dataFactory });
      expect(instance).toBeInstanceOf(Datasource);
      instance.close(done);
    }));
  });

  describe('A CompositeDatasource instance for 4 Datasources', () => {
    let datasource;
    function getDatasource() { return datasource; }
    beforeAll(() => new Promise((done) => {
      datasource = new CompositeDatasource({ references: references, dataFactory });
      datasource.initialize();
      datasource.on('initialized', done);
    }));
    afterAll(() => new Promise((done) => {
      datasource.close(done);
    }));

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

    it('should exclude disabled datasources', () => new Promise((done) => {
      let a = fakeDatasource({ enabled: false }), b = fakeDatasource({});
      let instance = new CompositeDatasource({ dataFactory, references: { a, b } });
      expect(instance._datasourceNames).toEqual(['b']);
      instance.close(done);
    }));
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

    it('should skip a non-matching datasource when choosing where to start', () => new Promise((done) => {
      let a = fakeDatasource({ quads: fakeQuads(2), graph: graphA, supportedFeatures: { triplePattern: true } }),
          b = fakeDatasource({ quads: fakeQuads(3), graph: graphB, supportedFeatures: { triplePattern: true, quadPattern: true } });
      let instance = new CompositeDatasource({ dataFactory, references: { a, b } });
      instance.initialize();
      instance.on('initialized', () => {
        let results = [];
        let stream = instance.select({ graph: graphB, features: { quadPattern: true } });
        stream.on('data', (quad) => results.push(quad));
        stream.on('end', () => {
          expect(results.length).toBe(3);
          expect(a.select.called).toBe(false);
          done();
        });
      });
    }));

    it('should stop instead of continuing into a non-matching datasource', () => new Promise((done) => {
      // b is registered first so it is immediately chosen as the starting
      // datasource; a is only considered when trying to continue past it,
      // which is where the graph-mismatch check needs to reject it.
      let a = fakeDatasource({ quads: fakeQuads(2), graph: graphA, supportedFeatures: { triplePattern: true } }),
          b = fakeDatasource({ quads: fakeQuads(3), graph: graphB, supportedFeatures: { triplePattern: true, quadPattern: true } });
      let instance = new CompositeDatasource({ dataFactory, references: { b, a } });
      instance.initialize();
      instance.on('initialized', () => {
        let results = [];
        let stream = instance.select({ graph: graphB, limit: 10, features: { quadPattern: true, limit: true } });
        stream.on('data', (quad) => results.push(quad));
        stream.on('end', () => {
          expect(results.length).toBe(3);
          expect(a.select.called).toBe(false);
          done();
        });
      });
    }));
  });

  describe('A CompositeDatasource needing an exact count', () => {
    let a, instance, query;
    beforeAll(() => new Promise((done) => {
      a = fakeDatasource({ quads: fakeQuads(1001), hasExactCount: false });
      instance = new CompositeDatasource({ dataFactory, references: { a } });
      instance.initialize();
      instance.on('initialized', done);
      query = { offset: 1, limit: 10, features: { triplePattern: true, offset: true, limit: true } };
    }));

    it('should compute an exact count when the inexact metadata is not enough', () => new Promise((done) => {
      let stream = instance.select(query), totalCount;
      stream.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      stream.on('data', () => {});
      stream.on('end', () => { expect(totalCount).toBe(1001); done(); });
    }));

    it('should use the cached exact count on a repeated identical query', () => new Promise((done) => {
      let selectCallsBefore = a.select.callCount;
      let stream = instance.select(query), totalCount;
      stream.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      stream.on('data', () => {});
      stream.on('end', () => {
        expect(totalCount).toBe(1001);
        // Metadata check + final fetch, but no extra manual-count select this time
        expect(a.select.callCount).toBe(selectCallsBefore + 2);
        done();
      });
    }));
  });

  describe('A CompositeDatasource with a manually-computed count of 1000 or fewer', () => {
    let a, instance, query;
    beforeAll(() => new Promise((done) => {
      a = fakeDatasource({ quads: fakeQuads(5), hasExactCount: false });
      instance = new CompositeDatasource({ dataFactory, references: { a } });
      instance.initialize();
      instance.on('initialized', done);
      query = { offset: 1, limit: 10, features: { triplePattern: true, offset: true, limit: true } };
    }));

    it('should recompute the exact count on every repeated query, since it is never cached', () => new Promise((done) => {
      let selectCallsBefore = a.select.callCount;
      let stream = instance.select(query), totalCount;
      stream.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      stream.on('data', () => {});
      stream.on('end', () => {
        expect(totalCount).toBe(5);
        // Metadata check + manual-count select + final fetch, every time
        expect(a.select.callCount).toBe(selectCallsBefore + 3);
        done();
      });
    }));
  });

  describe('_executeQuery pushing a falsy result element', () => {
    it('should not count a falsy element, but still forward it to the destination', () => new Promise((done) => {
      let a = fakeDatasource({ quads: [null, {}] });
      let instance = new CompositeDatasource({ dataFactory, references: { a } });
      instance.initialize();
      instance.on('initialized', () => {
        let pushed = [];
        let destination = {
          setProperty: () => {},
          _push: (element) => pushed.push(element),
          close: () => {
            expect(pushed).toEqual([null, {}]);
            done();
          },
        };
        instance._executeQuery({ offset: 0, limit: 10 }, destination);
      });
    }));
  });
});

function itShouldExecute(getDatasource, name, query,
  expectedResultsCount, expectedTotalCount, expectedTriples) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount, triples = [];
    beforeAll(() => new Promise((done) => {
      let result = getDatasource().select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', (triple) => { resultsCount++; expectedTriples && triples.push(triple); });
      result.on('end', done);
    }));

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
