/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
let RdfView = require('../../lib/views/RdfView').RdfView,
    View = require('../../lib/views/View').View;

let N3 = require('n3'),
    PassThrough = require('stream').PassThrough;

const dataFactory = N3.DataFactory;

describe('RdfView', () => {
  describe('The RdfView module', () => {
    it('should be a function', () => {
      expect(typeof RdfView).toBe('function');
    });

    it('should be a View subclass', () => {
      expect(RdfView.prototype instanceof View).toBe(true);
    });
  });

  describe('An RdfView instance', () => {
    describe('without a _generateRdf implementation', () => {
      it('should throw an error when calling _generateRdf', () => {
        expect(() => { new RdfView('', { dataFactory })._generateRdf({}, noop, noop, noop); })
          .toThrow('The _generateRdf method is not yet implemented.');
      });
    });

    describe('_renderViewExtension', () => {
      it('should call _generateRdf on an extension that implements it', () => {
        let extension = { _generateRdf: sinon.spy() },
            view = new RdfView('', { dataFactory }),
            options = { writer: { data: noop, meta: noop, end: noop } }, done = noop;
        view._renderViewExtension(extension, options, {}, {}, done);
        expect(extension._generateRdf.calledOnce).toBe(true);
        expect(extension._generateRdf
          .calledWith(options, options.writer.data, options.writer.meta, done)).toBe(true);
      });

      it('should do nothing for an extension that does not implement _generateRdf', () => {
        let extension = {},
            view = new RdfView('', { dataFactory }),
            options = { writer: { data: noop, meta: noop, end: noop } };
        expect(() => { view._renderViewExtension(extension, options, {}, {}, noop); }).not.toThrow();
      });
    });

    describe('_addDatasources', () => {
      it('should skip datasources without a url', () => {
        let view = new RdfView('', { dataFactory }), metadata = sinon.spy();
        view._addDatasources({ datasources: { a: { title: 'no-url datasource' } } }, noop, metadata);
        expect(metadata.called).toBe(false);
      });
    });

    describe('_createN3Writer', () => {
      it('should preserve a metadata quad\'s own non-default graph', () => new Promise((done) => {
        let view = new RdfView('', { dataFactory }), written = '';
        let response = { write: (data) => { written += data; } };
        let writer = view._createN3Writer(
          { contentType: 'application/trig', metadataGraph: 'urn:meta', fragmentUrl: 'urn:frag', prefixes: {} },
          response, () => {
            expect(written).toContain('urn:owngraph');
            done();
          });
        writer.meta(dataFactory.quad(
          dataFactory.namedNode('urn:s'), dataFactory.namedNode('urn:p'), dataFactory.namedNode('urn:o'),
          dataFactory.namedNode('urn:owngraph')));
        writer.end();
      }));

      it('should write nothing when the underlying N3 writer errors', () => new Promise((done) => {
        let originalEnd = N3.Writer.prototype.end;
        N3.Writer.prototype.end = function (callback) { callback(new Error('failed')); };
        try {
          let view = new RdfView('', { dataFactory }), written;
          let response = { write: (data) => { written = data; } };
          let writer = view._createN3Writer({ contentType: 'text/turtle', prefixes: {} }, response, () => {
            expect(written).toBe('');
            done();
          });
          writer.end();
        }
        finally { N3.Writer.prototype.end = originalEnd; }
      }));
    });

    describe('_createJsonLdWriter', () => {
      function collect() {
        let response = new PassThrough(), output = '';
        response.on('data', (d) => { output += d; });
        return { response: response, getOutput: () => output };
      }

      it('should not set @base when the prefixes have no base entry', () => new Promise((done) => {
        let view = new RdfView('', { dataFactory }), { response, getOutput } = collect();
        let writer = view._createJsonLdWriter({ prefixes: {} }, response, () => {
          expect(JSON.parse(getOutput())['@context']).not.toHaveProperty('@base');
          done();
        });
        writer.end();
      }));

      it('should set @base when the prefixes have a base entry', () => new Promise((done) => {
        let view = new RdfView('', { dataFactory }), { response, getOutput } = collect();
        let writer = view._createJsonLdWriter({ prefixes: { '': 'http://example.org/' } }, response, () => {
          expect(JSON.parse(getOutput())['@context']).toHaveProperty('@base', 'http://example.org/');
          done();
        });
        writer.end();
      }));

      it('should preserve a metadata quad\'s own non-default graph', () => new Promise((done) => {
        let view = new RdfView('', { dataFactory }), { response, getOutput } = collect();
        let writer = view._createJsonLdWriter({ prefixes: {} }, response, () => {
          expect(getOutput()).toContain('urn:owngraph');
          done();
        });
        writer.meta(dataFactory.quad(
          dataFactory.namedNode('urn:s'), dataFactory.namedNode('urn:p'), dataFactory.namedNode('urn:o'),
          dataFactory.namedNode('urn:owngraph')));
        writer.end();
      }));

      it('should use the default graph for default-graph metadata when no metadataGraph is set', () => new Promise((done) => {
        let view = new RdfView('', { dataFactory }), { response, getOutput } = collect();
        let writer = view._createJsonLdWriter({ prefixes: {}, metadataGraph: undefined }, response, () => {
          let parsed = JSON.parse(getOutput());
          expect(parsed['@graph'][0]).toHaveProperty('@id', 'urn:s');
          done();
        });
        writer.meta(dataFactory.quad(
          dataFactory.namedNode('urn:s'), dataFactory.namedNode('urn:p'), dataFactory.namedNode('urn:o'),
          dataFactory.defaultGraph()));
        writer.end();
      }));

      it('should call back with an error when the underlying JSON-LD serializer errors', () => new Promise((done) => {
        let view = new RdfView('', { dataFactory }), { response } = collect(), callCount = 0;
        let writer = view._createJsonLdWriter({ prefixes: {} }, response, (error) => {
          if (callCount++ === 0) {
            expect(error.message).toContain('Invalid JSON literal');
            done();
          }
        });
        writer.data(dataFactory.quad(
          dataFactory.namedNode('urn:s'), dataFactory.namedNode('urn:p'),
          dataFactory.literal('not valid json', dataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON'))));
      }));
    });
  });
});

function noop() {}
