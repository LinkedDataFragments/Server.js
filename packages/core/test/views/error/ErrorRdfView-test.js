/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, vi } from 'vitest';
let ErrorRdfView = require('../../../lib/views/error/ErrorRdfView').ErrorRdfView,
    RdfView = require('../../../lib/views/RdfView').RdfView;

let dataFactory = require('n3').DataFactory;

describe('ErrorRdfView', () => {
  it('should be a function', () => {
    expect(typeof ErrorRdfView).toBe('function');
  });

  it('should be an RdfView constructor', () => {
    expect(new ErrorRdfView({ dataFactory })).toBeInstanceOf(RdfView);
  });

  it('should emit datasource metadata and call done', () => {
    let view = new ErrorRdfView({ dataFactory });
    let metadata = vi.fn(), done = vi.fn();
    let settings = { datasources: { a: { url: 'http://example.org/a', title: 'A' } } };

    view._generateRdf(settings, () => {}, metadata, done);

    expect(metadata).toHaveBeenCalled();
    expect(done).toHaveBeenCalledOnce();
  });
});
