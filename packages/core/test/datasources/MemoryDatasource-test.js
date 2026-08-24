/*! @license MIT ©2014-2015 Ruben Verborgh and Ruben Taelman, Ghent University - imec */

import { describe, it, expect } from 'vitest';
import { once } from 'events';
let MemoryDatasource = require('../../lib/datasources/MemoryDatasource').MemoryDatasource,
    Datasource = require('../../lib/datasources/Datasource').Datasource;

let dataFactory = require('n3').DataFactory;

describe('MemoryDatasource', () => {
  describe('The MemoryDatasource module', () => {
    it('should be a function', () => {
      expect(typeof MemoryDatasource).toBe('function');
    });

    it('should be a MemoryDatasource constructor', () => {
      expect(new MemoryDatasource({ dataFactory })).toBeInstanceOf(MemoryDatasource);
    });

    it('should be a Datasource constructor', () => {
      expect(new MemoryDatasource({ dataFactory })).toBeInstanceOf(Datasource);
    });
  });

  describe('A MemoryDatasource instance with a bare file path', () => {
    it('should prepend the file:// protocol', () => {
      let datasource = new MemoryDatasource({ dataFactory, file: '/tmp/example.ttl' });
      expect(datasource._url).toBe('file:///tmp/example.ttl');
    });
  });

  describe('A MemoryDatasource instance with an already-prefixed file path', () => {
    it('should leave the protocol untouched', () => {
      let datasource = new MemoryDatasource({ dataFactory, file: 'file:///tmp/example.ttl' });
      expect(datasource._url).toBe('file:///tmp/example.ttl');
    });
  });

  describe('A MemoryDatasource instance without an overridden _getAllQuads', () => {
    it('should error when initialized', async () => {
      let datasource = new MemoryDatasource({ dataFactory });
      let errorEvent = once(datasource, 'error');
      datasource.initialize();
      let [error] = await errorEvent;
      expect(error.message).toBe('_getAllQuads is not implemented');
    });
  });

  describe('A MemoryDatasource subclass whose _getAllQuads errors', () => {
    class FailingDatasource extends MemoryDatasource {
      _getAllQuads(addQuad, done) {
        done(new Error('could not read quads'));
      }
    }

    it('should error when initialized', async () => {
      let datasource = new FailingDatasource({ dataFactory });
      let errorEvent = once(datasource, 'error');
      datasource.initialize();
      let [error] = await errorEvent;
      expect(error.message).toBe('could not read quads');
    });
  });
});
