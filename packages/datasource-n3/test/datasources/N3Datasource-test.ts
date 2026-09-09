/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { once } from 'events';
import { datasources as n3Datasources } from '../../index';
import { datasources as coreDatasources } from '@ldf/core';
import type { Query } from '@ldf/core';
import type { Quad } from 'rdf-js';
import * as path from 'path';
import { DataFactory as dataFactory } from 'n3';

const { N3Datasource } = n3Datasources;
const { Datasource } = coreDatasources;

let exampleTurtleUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.ttl');

describe('N3Datasource', () => {
  describe('The N3Datasource module', () => {
    it('should be a function', () => {
      expect(typeof N3Datasource).toBe('function');
    });

    it('should be a N3Datasource constructor', async () => {
      let instance = new N3Datasource({ dataFactory, url: exampleTurtleUrl });
      expect(instance).toBeInstanceOf(N3Datasource);
      await new Promise<void>((resolve) => instance.close(resolve));
    });

    it('should create Datasource objects', async () => {
      let instance = new N3Datasource({ dataFactory, url: exampleTurtleUrl });
      expect(instance).toBeInstanceOf(Datasource);
      await new Promise<void>((resolve) => instance.close(resolve));
    });
  });

  describe('A N3Datasource instance for an example Turtle file', () => {
    let datasource = new N3Datasource({ dataFactory, url: exampleTurtleUrl });
    beforeAll(async () => {
      datasource.initialize();
      await once(datasource, 'initialized');
    });
    afterAll(() => new Promise<void>((resolve) => datasource.close(resolve)));

    itShouldExecute(datasource,
      'the empty query',
      { features: { triplePattern: true } },
      129, 129);

    itShouldExecute(datasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, 129);

    itShouldExecute(datasource,
      'the empty query with an offset',
      { offset: 10, features: { triplePattern: true, offset: true } },
      119, 129);

    itShouldExecute(datasource,
      'a query for an existing subject',
      { subject: dataFactory.namedNode('http://example.org/s1'),   limit: 10, features: { triplePattern: true, limit: true } },
      10, 100);

    itShouldExecute(datasource,
      'a query for a non-existing subject',
      { subject: dataFactory.namedNode('http://example.org/p1'),   limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/p1'), limit: 10, features: { triplePattern: true, limit: true } },
      10, 110);

    itShouldExecute(datasource,
      'a query for a non-existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/s1'), limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(datasource,
      'a query for an existing object',
      { object: dataFactory.namedNode('http://example.org/o001'),  limit: 10, features: { triplePattern: true, limit: true } },
      3, 3);

    itShouldExecute(datasource,
      'a query for a non-existing object',
      { object: dataFactory.namedNode('http://example.org/s1'),    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);
  });
});

function itShouldExecute(datasource: InstanceType<typeof N3Datasource>, name: string, query: Query, expectedResultsCount: number, expectedTotalCount: number) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount: number | undefined;
    beforeAll(async () => {
      let result = datasource.select(query);
      result.getProperty('metadata', (metadata: { totalCount: number }) => { totalCount = metadata.totalCount; });
      result.on('data', (_triple: Quad) => { resultsCount++; });
      await once(result, 'end');
    });

    it('should return the expected number of triples', () => {
      expect(resultsCount).toBe(expectedResultsCount);
    });

    it('should emit the expected total number of triples', () => {
      expect(totalCount).toBe(expectedTotalCount);
    });
  });
}
