/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
import { once } from 'events';
let EmptyDatasource = require('../../lib/datasources/EmptyDatasource').EmptyDatasource,
    MemoryDatasource = require('../../lib/datasources/MemoryDatasource').MemoryDatasource;

let dataFactory = require('n3').DataFactory;

describe('EmptyDatasource', () => {
  it('should be a function', () => {
    expect(typeof EmptyDatasource).toBe('function');
  });

  it('should be a MemoryDatasource constructor', () => {
    expect(new EmptyDatasource({ dataFactory })).toBeInstanceOf(MemoryDatasource);
  });

  it('should never produce any quads', async () => {
    let datasource = new EmptyDatasource({ dataFactory });
    datasource.initialize();
    await once(datasource, 'initialized');
    let quads = [];
    let stream = datasource.select({ features: { triplePattern: true } });
    stream.on('data', (quad) => quads.push(quad));
    await once(stream, 'end');
    expect(quads).toEqual([]);
  });
});
