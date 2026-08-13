/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
let IndexDatasource = require('../../lib/datasources/IndexDatasource').IndexDatasource,
    MemoryDatasource = require('../../lib/datasources/MemoryDatasource').MemoryDatasource;

let dataFactory = require('n3').DataFactory;

function collect(datasource) {
  return new Promise((resolve) => {
    datasource.initialize();
    datasource.on('initialized', () => {
      let quads = [];
      let stream = datasource.select({ features: { triplePattern: true } });
      stream.on('data', (quad) => quads.push(quad));
      stream.on('end', () => resolve(quads));
    });
  });
}

describe('IndexDatasource', () => {
  it('should be a function', () => {
    expect(typeof IndexDatasource).toBe('function');
  });

  it('should be a MemoryDatasource constructor', () => {
    expect(new IndexDatasource({ dataFactory, datasources: {} })).toBeInstanceOf(MemoryDatasource);
  });

  it('should set its role to index', () => {
    expect(new IndexDatasource({ dataFactory, datasources: {} }).role).toBe('index');
  });

  it('should remove a datasource registered under the root path', () => {
    let datasource = new IndexDatasource({
      dataFactory,
      datasources: { '/': { url: 'http://example.org/self' } },
    });
    expect(datasource._datasources).not.toHaveProperty('/');
  });

  it('should list type, label, title, and description triples for a visible datasource with a url', () => {
    let datasource = new IndexDatasource({
      dataFactory,
      datasources: {
        a: { url: 'http://example.org/a', title: 'A', description: 'Datasource A' },
      },
    });
    return collect(datasource).then((quads) => {
      expect(quads).toHaveLength(4);
      let predicates = quads.map((quad) => quad.predicate.value).sort();
      expect(predicates).toEqual([
        'http://purl.org/dc/terms/description',
        'http://purl.org/dc/terms/title',
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        'http://www.w3.org/2000/01/rdf-schema#label',
      ]);
      quads.forEach((quad) => expect(quad.subject.value).toBe('http://example.org/a'));
    });
  });

  it('should skip a hidden datasource', () => {
    let datasource = new IndexDatasource({
      dataFactory,
      datasources: { a: { url: 'http://example.org/a', hide: true } },
    });
    return collect(datasource).then((quads) => {
      expect(quads).toEqual([]);
    });
  });

  it('should skip a datasource without a url', () => {
    let datasource = new IndexDatasource({
      dataFactory,
      datasources: { a: { title: 'No URL' } },
    });
    return collect(datasource).then((quads) => {
      expect(quads).toEqual([]);
    });
  });

  it('should only list a type triple for a datasource without title or description', () => {
    let datasource = new IndexDatasource({
      dataFactory,
      datasources: { a: { url: 'http://example.org/a' } },
    });
    return collect(datasource).then((quads) => {
      expect(quads).toHaveLength(1);
      expect(quads[0].predicate.value).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    });
  });
});
