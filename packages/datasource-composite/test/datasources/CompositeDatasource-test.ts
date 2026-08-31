/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { datasources as compositeDatasources } from '../../index';
import { datasources as coreDatasources } from '@ldf/core';
import { datasources as hdtDatasources } from '@ldf/datasource-hdt';
import { datasources as n3Datasources } from '@ldf/datasource-n3';
import type { DatasourceOptions, DatasourceRegistry, Query } from '@ldf/core';
import type { Quad } from 'rdf-js';
import * as path from 'path';
import { DataFactory as dataFactory } from 'n3';

import { once } from 'events';

const { CompositeDatasource } = compositeDatasources;
const { Datasource } = coreDatasources;
const { HdtDatasource } = hdtDatasources;
const { N3Datasource } = n3Datasources;

let exampleHdtFile = path.join(__dirname, '../../../../test/assets/test.hdt');
let exampleHdtFileWithBlanks = path.join(__dirname, '../../../../test/assets/test-blank.hdt');
let exampleTurtleUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.ttl');
let exampleTrigUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.trig');

interface DatasourceReferenceConfig {
  settings: DatasourceOptions;
  datasourceType: new (options: DatasourceOptions) => InstanceType<typeof Datasource>;
  size: number;
}

describe('CompositeDatasource', () => {
  let referenceConfigs: Record<string, DatasourceReferenceConfig> = {
    data0: { settings: { dataFactory, file: exampleHdtFile }, datasourceType: HdtDatasource, size: 132 },
    data1: { settings: { dataFactory, file: exampleHdtFileWithBlanks, graph: 'http://example.org/graph0' }, datasourceType: HdtDatasource, size: 6 },
    data2: { settings: { dataFactory, url: exampleTurtleUrl }, datasourceType: N3Datasource, size: 129 },
    data3: { settings: { dataFactory, url: exampleTrigUrl }, datasourceType: N3Datasource, size: 7 },
  };
  let references: DatasourceRegistry = {};
  Object.keys(referenceConfigs).forEach((datasourceId) => {
    let config = referenceConfigs[datasourceId];
    references[datasourceId] = new config.datasourceType(config.settings);
  });
  let totalSize = Object.keys(referenceConfigs).reduce((acc, key) => {
    return acc + referenceConfigs[key].size;
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
      await new Promise<void>((resolve) => instance.close(resolve));
    });

    it('should create CompositeDatasource objects', async () => {
      let instance = new CompositeDatasource({ references: references, dataFactory });
      expect(instance).toBeInstanceOf(CompositeDatasource);
      await new Promise<void>((resolve) => instance.close(resolve));
    });

    it('should create Datasource objects', async () => {
      let instance = new CompositeDatasource({ references: references, dataFactory });
      expect(instance).toBeInstanceOf(Datasource);
      await new Promise<void>((resolve) => instance.close(resolve));
    });
  });

  describe('A CompositeDatasource instance for 4 Datasources', () => {
    let datasource: InstanceType<typeof CompositeDatasource>;
    function getDatasource() { return datasource; }
    beforeAll(async () => {
      datasource = new CompositeDatasource({ references: references, dataFactory });
      datasource.initialize();
      await once(datasource, 'initialized');
    });
    afterAll(() => new Promise<void>((resolve) => datasource.close(resolve)));

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
});

function itShouldExecute(getDatasource: () => InstanceType<typeof CompositeDatasource>, name: string, query: Query,
  expectedResultsCount: number, expectedTotalCount: number, expectedTriples?: Quad[]) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount: number | undefined, triples: Quad[] = [];
    beforeAll(async () => {
      let result = getDatasource().select(query);
      result.getProperty('metadata', (metadata: { totalCount: number }) => { totalCount = metadata.totalCount; });
      result.on('data', (triple: Quad) => { resultsCount++; expectedTriples && triples.push(triple); });
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
