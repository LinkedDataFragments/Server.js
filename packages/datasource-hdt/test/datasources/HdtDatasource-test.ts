/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { datasources as hdtDatasources } from '../../index';
import { datasources as coreDatasources, UrlData } from '@ldf/core';
import type { Query } from '@ldf/core';
import type { Quad } from 'rdf-js';
import { stringQuadToQuad, type IStringQuad } from 'rdf-string';
import * as path from 'path';
import { DataFactory as dataFactory } from 'n3';
import { once } from 'events';

const { HdtDatasource } = hdtDatasources;
const { Datasource } = coreDatasources;

let exampleHdtFile = path.join(__dirname, '../../../../test/assets/test.hdt');
let exampleHdtFileWithBlanks = path.join(__dirname, '../../../../test/assets/test-blank.hdt');

describe('HdtDatasource', () => {
  describe('The HdtDatasource module', () => {
    it('should be a function', () => {
      expect(typeof HdtDatasource).toBe('function');
    });

    it('should be an HdtDatasource constructor', async () => {
      let instance = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      expect(instance).toBeInstanceOf(HdtDatasource);
      await new Promise<Error | undefined>((resolve) => instance.close(resolve));
    });

    it('should create Datasource objects', async () => {
      let instance = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      expect(instance).toBeInstanceOf(Datasource);
      await new Promise<Error | undefined>((resolve) => instance.close(resolve));
    });
  });

  describe('A HdtDatasource instance for an example HDT file', () => {
    let datasource: InstanceType<typeof HdtDatasource>;
    function getDatasource() { return datasource; }
    beforeAll(async () => {
      datasource = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      datasource.initialize();
      await once(datasource, 'initialized');
    });
    afterAll(() => new Promise<Error | undefined>((resolve) => datasource.close(resolve)));

    itShouldExecute(getDatasource,
      'the empty query',
      { features: { triplePattern: true } },
      132, 132);

    itShouldExecute(getDatasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, 132);

    itShouldExecute(getDatasource,
      'the empty query with an offset',
      { offset: 10, features: { triplePattern: true, offset: true } },
      122, 132);

    itShouldExecute(getDatasource,
      'a query for an existing subject',
      { subject: dataFactory.namedNode('http://example.org/s1'),   limit: 10, features: { triplePattern: true, limit: true } },
      10, 100);

    itShouldExecute(getDatasource,
      'a query for a non-existing subject',
      { subject: dataFactory.namedNode('http://example.org/p1'),   limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/p1'), limit: 10, features: { triplePattern: true, limit: true } },
      10, 110);

    itShouldExecute(getDatasource,
      'a query for a non-existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/s1'), limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing object',
      { object: dataFactory.namedNode('http://example.org/o001'),  limit: 10, features: { triplePattern: true, limit: true } },
      3, 3);

    itShouldExecute(getDatasource,
      'a query for a non-existing object',
      { object: dataFactory.namedNode('http://example.org/s1'),    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for a non-default graph',
      { object: dataFactory.namedNode('http://example.org/s1'), graph: dataFactory.namedNode('g'), features: { quadPattern: true } },
      0, 0);
  });

  describe('A HdtDatasource instance with blank nodes', () => {
    let datasource: InstanceType<typeof HdtDatasource>;
    function getDatasource() { return datasource; }
    beforeAll(async () => {
      datasource = new HdtDatasource({ dataFactory, file: exampleHdtFileWithBlanks });
      datasource.initialize();
      await once(datasource, 'initialized');
    });
    afterAll(() => new Promise<Error | undefined>((resolve) => datasource.close(resolve)));

    itShouldExecute(getDatasource,
      'the empty query',
      { features: { triplePattern: true } },
      6, 6,
      [
        { subject: 'genid:a', predicate: 'b', object: 'c1' },
        { subject: 'genid:a', predicate: 'b', object: 'c2' },
        { subject: 'genid:a', predicate: 'b', object: 'c3' },
        { subject: 'a',       predicate: 'b', object: 'genid:c1' },
        { subject: 'a',       predicate: 'b', object: 'genid:c2' },
        { subject: 'a',       predicate: 'b', object: 'genid:c3' },
      ]);

    itShouldExecute(getDatasource,
      'a query for a blank subject',
      { subject: dataFactory.blankNode('a'), features: { triplePattern: true } },
      3, 3);

    itShouldExecute(getDatasource,
      'a query for a IRI that corresponds to a blank node as subject',
      { subject: dataFactory.namedNode('genid:a'), features: { triplePattern: true } },
      3, 3,
      [
        { subject: 'genid:a', predicate: 'b', object: 'c1' },
        { subject: 'genid:a', predicate: 'b', object: 'c2' },
        { subject: 'genid:a', predicate: 'b', object: 'c3' },
      ]);

    itShouldExecute(getDatasource,
      'a query for a IRI that corresponds to a blank node as object',
      { object: dataFactory.namedNode('genid:c1'), features: { triplePattern: true } },
      1, 1,
      [
        { subject: 'a', predicate: 'b', object: 'genid:c1' },
      ]);
  });

  describe('A HdtDatasource instance with blank nodes and a blank node prefix', () => {
    let datasource: InstanceType<typeof HdtDatasource>;
    function getDatasource() { return datasource; }
    beforeAll(async () => {
      datasource = new HdtDatasource({
        dataFactory,
        file: exampleHdtFileWithBlanks,
        urlData: new UrlData({ baseURL: 'http://example.org/' }),
      });
      datasource.initialize();
      await once(datasource, 'initialized');
    });
    afterAll(() => new Promise<Error | undefined>((resolve) => datasource.close(resolve)));

    itShouldExecute(getDatasource,
      'the empty query',
      { features: { triplePattern: true } },
      6, 6,
      [
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c1' },
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c2' },
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c3' },
        { subject: 'a', predicate: 'b', object: 'http://example.org/.well-known/genid/c1' },
        { subject: 'a', predicate: 'b', object: 'http://example.org/.well-known/genid/c2' },
        { subject: 'a', predicate: 'b', object: 'http://example.org/.well-known/genid/c3' },
      ]);

    itShouldExecute(getDatasource,
      'a query for a blank subject',
      { subject: dataFactory.blankNode('a'), features: { triplePattern: true } },
      3, 3);

    itShouldExecute(getDatasource,
      'a query for a IRI that corresponds to a blank node as subject',
      { subject: dataFactory.namedNode('http://example.org/.well-known/genid/a'), features: { triplePattern: true } },
      3, 3,
      [
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c1' },
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c2' },
        { subject: 'http://example.org/.well-known/genid/a', predicate: 'b', object: 'c3' },
      ]);

    itShouldExecute(getDatasource,
      'a query for a IRI that corresponds to a blank node as object',
      { object: dataFactory.namedNode('http://example.org/.well-known/genid/c1'), features: { triplePattern: true } },
      1, 1,
      [
        { subject: 'a', predicate: 'b', object: 'http://example.org/.well-known/genid/c1' },
      ]);
  });
});

function itShouldExecute(getDatasource: () => InstanceType<typeof HdtDatasource>, name: string, query: Query,
  expectedResultsCount: number, expectedTotalCount: number, expectedTriples?: IStringQuad[]) {
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
          expect(triples[i]).toEqual(stringQuadToQuad(expectedTriples[i], dataFactory));
      });
    }
  });
}
