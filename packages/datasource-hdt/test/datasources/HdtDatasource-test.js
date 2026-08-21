/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
let HdtDatasource = require('../../').datasources.HdtDatasource,
    ExternalHdtDatasource = require('../../lib/datasources/ExternalHdtDatasource').ExternalHdtDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    UrlData = require('@ldf/core').UrlData,
    path = require('path'),
    dataFactory = require('n3').DataFactory,
    RdfString = require('rdf-string'),
    sinon = require('sinon');

let exampleHdtFile = path.join(__dirname, '../../../../test/assets/test.hdt');
let exampleHdtFileWithBlanks = path.join(__dirname, '../../../../test/assets/test-blank.hdt');

describe('HdtDatasource', () => {
  describe('The HdtDatasource module', () => {
    it('should be a function', () => {
      expect(typeof HdtDatasource).toBe('function');
    });

    it('should be an HdtDatasource constructor', () => new Promise((done) => {
      let instance = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      expect(instance).toBeInstanceOf(HdtDatasource);
      instance.close(done);
    }));

    it('should create Datasource objects', () => new Promise((done) => {
      let instance = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      expect(instance).toBeInstanceOf(Datasource);
      instance.close(done);
    }));

    it('should not throw when constructed without options', () => {
      expect(() => {
        // eslint-disable-next-line no-new
        new HdtDatasource();
      }).not.toThrow();
    });

    it('should return an ExternalHdtDatasource when the external option is set', () => {
      expect(new HdtDatasource({ dataFactory, file: exampleHdtFile, external: true }))
        .toBeInstanceOf(ExternalHdtDatasource);
    });

    it('should do nothing when closed a second time', () => new Promise((done) => {
      let instance = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      instance.on('initialized', () => {
        instance.close(() => {
          expect(() => { instance.close(); }).not.toThrow();
          done();
        });
      });
    }));
  });

  describe('_executeQuery', () => {
    it('should round the estimated total count up when it underestimates the offset and page', () => new Promise((done) => {
      let instance = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      instance._hdtDocument = {
        searchTriples: () => Promise.resolve({ triples: [{}, {}], totalCount: 5, hasExactCount: false }),
      };
      let setProperty = sinon.spy();
      let destination = {
        setProperty,
        _push: sinon.spy(),
        close: () => {
          expect(setProperty.calledWith('metadata', { totalCount: 6, hasExactCount: false })).toBe(true);
          done();
        },
      };
      instance._executeQuery({ offset: 4, limit: 10 }, destination);
    }));

    it('should double the returned triple count when it fills the whole page', () => new Promise((done) => {
      let instance = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      instance._hdtDocument = {
        searchTriples: () => Promise.resolve({ triples: [{}, {}], totalCount: 1, hasExactCount: false }),
      };
      let setProperty = sinon.spy();
      let destination = {
        setProperty,
        _push: sinon.spy(),
        close: () => {
          expect(setProperty.calledWith('metadata', { totalCount: 8, hasExactCount: false })).toBe(true);
          done();
        },
      };
      instance._executeQuery({ offset: 4, limit: 1 }, destination);
    }));

    it('should emit an error when the underlying HDT search fails', () => new Promise((done) => {
      let instance = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      let error = new Error('search failed');
      instance._hdtDocument = { searchTriples: () => Promise.reject(error) };
      let destination = { setProperty: () => {}, emit: (event, err) => {
        expect(event).toBe('error');
        expect(err).toBe(error);
        done();
      } };
      instance._executeQuery({}, destination);
    }));
  });

  describe('A HdtDatasource instance for an example HDT file', () => {
    let datasource;
    function getDatasource() { return datasource; }
    beforeAll(() => new Promise((done) => {
      datasource = new HdtDatasource({ dataFactory, file: exampleHdtFile });
      datasource.initialize();
      datasource.on('initialized', done);
    }));
    afterAll(() => new Promise((done) => {
      datasource.close(done);
    }));

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
    let datasource;
    function getDatasource() { return datasource; }
    beforeAll(() => new Promise((done) => {
      datasource = new HdtDatasource({ dataFactory, file: exampleHdtFileWithBlanks });
      datasource.initialize();
      datasource.on('initialized', done);
    }));
    afterAll(() => new Promise((done) => {
      datasource.close(done);
    }));

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
    let datasource;
    function getDatasource() { return datasource; }
    beforeAll(() => new Promise((done) => {
      datasource = new HdtDatasource({
        dataFactory,
        file: exampleHdtFileWithBlanks,
        urlData: new UrlData({ baseURL: 'http://example.org/' }),
      });
      datasource.initialize();
      datasource.on('initialized', done);
    }));
    afterAll(() => new Promise((done) => {
      datasource.close(done);
    }));

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
          expect(triples[i]).toEqual(RdfString.stringQuadToQuad(expectedTriples[i], dataFactory));
      });
    }
  });
}
