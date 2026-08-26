/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { once } from 'events';
import { promisify } from 'util';
let RdfaDatasource = require('../../').datasources.RdfaDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    path = require('path'),
    dataFactory = require('n3').DataFactory;

let exampleRdfaUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.html');

describe('RdfaDatasource', () => {
  describe('The RdfaDatasource module', () => {
    it('should be a function', () => {
      expect(typeof RdfaDatasource).toBe('function');
    });

    it('should be a RdfaDatasource constructor', async () => {
      let instance = new RdfaDatasource({ dataFactory, url: exampleRdfaUrl });
      expect(instance).toBeInstanceOf(RdfaDatasource);
      await promisify(instance.close)();
    });

    it('should create Datasource objects', async () => {
      let instance = new RdfaDatasource({ dataFactory, url: exampleRdfaUrl });
      expect(instance).toBeInstanceOf(Datasource);
      await promisify(instance.close)();
    });
  });

  describe('A RdfaDatasource instance for an example RDFa HTML file', () => {
    let datasource = new RdfaDatasource({ dataFactory, url: exampleRdfaUrl });
    beforeAll(async () => {
      datasource.initialize();
      await once(datasource, 'initialized');
    });
    afterAll(() => promisify(datasource.close)());

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

function itShouldExecute(datasource, name, query, expectedResultsCount, expectedTotalCount) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount;
    beforeAll(async () => {
      let result = datasource.select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', (triple) => { resultsCount++; });
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
