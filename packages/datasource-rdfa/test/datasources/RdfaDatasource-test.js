/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

    it('should be a RdfaDatasource constructor', () => new Promise((done) => {
      let instance = new RdfaDatasource({ dataFactory, url: exampleRdfaUrl });
      expect(instance).toBeInstanceOf(RdfaDatasource);
      instance.close(done);
    }));

    it('should create Datasource objects', () => new Promise((done) => {
      let instance = new RdfaDatasource({ dataFactory, url: exampleRdfaUrl });
      expect(instance).toBeInstanceOf(Datasource);
      instance.close(done);
    }));

    it('should fall back to the file option when no url is given', () => {
      let instance = new RdfaDatasource({ dataFactory, file: exampleRdfaUrl });
      expect(instance._url).toBe(exampleRdfaUrl);
    });
  });

  describe('A RdfaDatasource instance for an example RDFa HTML file', () => {
    let datasource = new RdfaDatasource({ dataFactory, url: exampleRdfaUrl });
    beforeAll(() => new Promise((done) => {
      datasource.initialize();
      datasource.on('initialized', done);
    }));
    afterAll(() => new Promise((done) => { datasource.close(done); }));

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
    beforeAll(() => new Promise((done) => {
      let result = datasource.select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', (triple) => { resultsCount++; });
      result.on('end', done);
    }));

    it('should return the expected number of triples', () => {
      expect(resultsCount).toBe(expectedResultsCount);
    });

    it('should emit the expected total number of triples', () => {
      expect(totalCount).toBe(expectedTotalCount);
    });
  });
}
