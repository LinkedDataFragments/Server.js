/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createStreamCapture } from '../../../../../test/test-helpers';
import { views } from '../../../index';

import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import { empty, fromArray, TransformIterator } from 'asynciterator';
import type { AsyncIterator } from 'asynciterator';
import type { Quad } from 'rdf-js';
import { DataFactory as dataFactory } from 'n3';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import type { LdfRequest } from '../../../../core/index';

const { QuadPatternFragmentsRdfView } = views.quadpatternfragments;

function createRequest(): LdfRequest {
  return new IncomingMessage(new Socket());
}

describe('QuadPatternFragmentsRdfView', () => {
  describe('The QuadPatternFragmentsRdfView module', () => {
    it('should be a function', () => {
      expect(typeof QuadPatternFragmentsRdfView).toBe('function');
    });

    it('should be a QuadPatternFragmentsRdfView constructor', () => {
      expect(new QuadPatternFragmentsRdfView({ dataFactory })).toBeInstanceOf(QuadPatternFragmentsRdfView);
    });
  });

  describe('A QuadPatternFragmentsRdfView instance', () => {
    let view = new QuadPatternFragmentsRdfView({ dataFactory });
    let settings: { results?: AsyncIterator<Quad>; [key: string]: unknown } = {
      datasource: {
        title: 'My data',
        index: 'http://ex.org/#dataset',
        url: 'http://ex.org/data#dataset',
        templateUrl: 'http://ex.org/data{?subject,predicate,object,graph}',
        supportsQuads: true,
      },
      fragment: {
        url:             'http://ex.org/data?fragment',
        pageUrl:         'http://ex.org/data?fragment&page=3',
        firstPageUrl:    'http://ex.org/data?fragment&page=1',
        nextPageUrl:     'http://ex.org/data?fragment&page=4',
        previousPageUrl: 'http://ex.org/data?fragment&page=2',
      },
      prefixes: {
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
        hydra: 'http://www.w3.org/ns/hydra/core#',
        void: 'http://rdfs.org/ns/void#',
        dcterms: 'http://purl.org/dc/terms/',
      },
      query: {
        offset: 200,
        limit: 100,
        patternString: '{ a ?b ?c ?d }',
      },
    };

    _.each({
      'text/turtle': 'ttl',
      'application/trig': 'trig',
      'application/n-triples': 'nt',
      'application/n-quads': 'nq',
      'application/ld+json': 'jsonld',
    },
    (extension, format) => {
      describe('when render is called for ' + format, () => {
        function readAsset(name: string) {
          let file = path.join(__dirname, '../../../../../test/assets/', name + '.' + extension);
          return fs.readFileSync(file, 'utf8');
        }

        describe('with an empty triple stream', () => {
          let results = empty<Quad>();
          let response = createStreamCapture();
          beforeAll(() => new Promise<Error | null | undefined>((resolve) => {
            settings.results = results;
            response.getHeader = vi.fn().mockReturnValue(format);
            view.render(settings, createRequest(), response, resolve);
            results.setProperty('metadata', { totalCount: 1234 });
          }));

          it('should only write data source metadata', () => {
            expect(response.buffer).toBe(readAsset('empty-fragment'));
          });
        });

        describe('with a non-empty triple stream that writes metadata first', () => {
          let results = fromArray<Quad>([
            dataFactory.quad(dataFactory.namedNode('a'), dataFactory.namedNode('b'), dataFactory.namedNode('c'), dataFactory.defaultGraph()),
            dataFactory.quad(dataFactory.namedNode('a'), dataFactory.namedNode('d'), dataFactory.namedNode('e'), dataFactory.defaultGraph()),
            dataFactory.quad(dataFactory.namedNode('f'), dataFactory.namedNode('g'), dataFactory.namedNode('h'), dataFactory.defaultGraph()),
          ]);
          let response = createStreamCapture();
          beforeAll(() => new Promise<Error | null | undefined>((resolve) => {
            let transform = new TransformIterator<Quad>();
            settings.results = transform;
            response.getHeader = vi.fn().mockReturnValue(format);
            view.render(settings, createRequest(), response, resolve);
            transform.setProperty('metadata', { totalCount: 1234 });
            transform.source = results;
          }));

          it('should write data and metadata', () => {
            expect(response.buffer).toBe(readAsset('basic-fragment'));
          });
        });

        describe('with a non-empty triple stream that writes metadata afterwards', () => {
          let results = fromArray<Quad>([
            dataFactory.quad(dataFactory.namedNode('a'), dataFactory.namedNode('b'), dataFactory.namedNode('c'), dataFactory.defaultGraph()),
            dataFactory.quad(dataFactory.namedNode('a'), dataFactory.namedNode('d'), dataFactory.namedNode('e'), dataFactory.defaultGraph()),
            dataFactory.quad(dataFactory.namedNode('f'), dataFactory.namedNode('g'), dataFactory.namedNode('h'), dataFactory.defaultGraph()),
          ]);
          let response = createStreamCapture();
          beforeAll(() => new Promise<Error | null | undefined>((resolve) => {
            settings.results = results;
            response.getHeader = vi.fn().mockReturnValue(format);
            view.render(settings, createRequest(), response, resolve);
            setImmediate(() => {
              results.setProperty('metadata', { totalCount: 1234 });
            });
          }));

          it('should write data and metadata', () => {
            expect(response.buffer).toBe(readAsset('basic-fragment-metadata-last'));
          });
        });

        describe('with a query with a limit but no offset', () => {
          let results = empty<Quad>();
          let settings: { results?: AsyncIterator<Quad>; [key: string]: unknown } = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100 },
          };
          let response = createStreamCapture();
          beforeAll(() => new Promise<Error | null | undefined>((resolve) => {
            settings.results = results;
            response.getHeader = vi.fn().mockReturnValue(format);
            view.render(settings, createRequest(), response, resolve);
            results.setProperty('metadata', { totalCount: 1234 });
          }));

          it('should write a first page link', () => {
            expect(response.buffer).toContain('myfirst');
          });

          it('should write a next page link', () => {
            expect(response.buffer).toContain('mynext');
          });

          it('should not write a previous page link', () => {
            expect(response.buffer).not.toContain('myprevious');
          });
        });

        describe('with a query with a limit and offset before the end', () => {
          let results = empty<Quad>();
          let settings: { results?: AsyncIterator<Quad>; [key: string]: unknown } = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100, offset: 1133 },
          };
          let response = createStreamCapture();
          beforeAll(() => new Promise<Error | null | undefined>((resolve) => {
            settings.results = results;
            response.getHeader = vi.fn().mockReturnValue(format);
            view.render(settings, createRequest(), response, resolve);
            results.setProperty('metadata', { totalCount: 1234 });
          }));

          it('should write a first page link', () => {
            expect(response.buffer).toContain('myfirst');
          });

          it('should write a next page link', () => {
            expect(response.buffer).toContain('mynext');
          });

          it('should write a previous page link', () => {
            expect(response.buffer).toContain('myprevious');
          });
        });

        describe('with a query with a limit and offset past the end', () => {
          let results = empty<Quad>();
          let settings: { results?: AsyncIterator<Quad>; [key: string]: unknown } = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100, offset: 1135 },
          };
          let response = createStreamCapture();
          beforeAll(() => new Promise<Error | null | undefined>((resolve) => {
            settings.results = results;
            response.getHeader = vi.fn().mockReturnValue(format);
            view.render(settings, createRequest(), response, resolve);
            results.setProperty('metadata', { totalCount: 1234 });
          }));

          it('should write a first page link', () => {
            expect(response.buffer).toContain('myfirst');
          });

          it('should not write a next page link', () => {
            expect(response.buffer).not.toContain('mynext');
          });

          it('should write a previous page link', () => {
            expect(response.buffer).toContain('myprevious');
          });
        });
      });
    });
  });
});
