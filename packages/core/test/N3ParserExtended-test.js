/*! @license MIT ©2026 Ghent University - imec */
import { describe, it, expect } from 'vitest';
let N3ParserExtended = require('../lib/N3ParserExtended').N3ParserExtended;

describe('N3ParserExtended', () => {
  it('should be a function', () => {
    expect(typeof N3ParserExtended).toBe('function');
  });

  it('should expose the prefixes seen while parsing through prefixMap', () => {
    let parser = new N3ParserExtended();
    parser.parse('@prefix ex: <http://example.org/>.\nex:s ex:p ex:o.');
    expect(parser.prefixMap).toHaveProperty('ex', 'http://example.org/');
  });

  it('should parse synchronously and return quads when called without a callback', () => {
    let parser = new N3ParserExtended();
    let quads = parser.parse('<http://example.org/s> <http://example.org/p> <http://example.org/o>.');
    expect(quads).toHaveLength(1);
    expect(quads[0].subject.value).toBe('http://example.org/s');
  });

  it('should parse asynchronously through a callback', () => new Promise((done) => {
    let parser = new N3ParserExtended();
    let quads = [];
    parser.parse('<http://example.org/s> <http://example.org/p> <http://example.org/o>.', (error, quad) => {
      expect(error).toBeNull();
      if (quad)
        quads.push(quad);
      else {
        expect(quads).toHaveLength(1);
        done();
      }
    });
  }));

  it('should reset the shared blank node prefix', () => {
    expect(() => N3ParserExtended.resetBlankNodePrefix()).not.toThrow();
  });
});
