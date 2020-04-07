/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let QuadPatternFragmentsRdfView = require('../../../').views.quadpatternfragments.QuadPatternFragmentsRdfView;

let _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    AsyncIterator = require('asynciterator'),
    N3 = require('n3');

const dataFactory = N3.DataFactory;

describe('QuadPatternFragmentsRdfView', () => {
  describe('The QuadPatternFragmentsRdfView module', () => {
    it('should be a function', () => {
      QuadPatternFragmentsRdfView.should.be.a('function');
    });

    it('should be a QuadPatternFragmentsRdfView constructor', () => {
      new QuadPatternFragmentsRdfView({ dataFactory }).should.be.an.instanceof(QuadPatternFragmentsRdfView);
    });
  });

  describe('A QuadPatternFragmentsRdfView instance', () => {
    let view = new QuadPatternFragmentsRdfView({ dataFactory });
    let settings = {
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
        function readAsset(name) {
          let file = path.join(__dirname, '../../../../../test/assets/', name + '.' + extension);
          return fs.readFileSync(file, 'utf8');
        }

        describe('with an empty triple stream', () => {
          let results = AsyncIterator.empty();
          let response = test.createStreamCapture();
          before((done) => {
            settings.results = results;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            results.setProperty('metadata', { totalCount: 1234 });
          });

          it('should only write data source metadata', () => {
            response.buffer.should.equal(readAsset('empty-fragment'));
          });
        });

        describe('with a non-empty triple stream that writes metadata first', () => {
          let results = AsyncIterator.fromArray([
            dataFactory.quad(dataFactory.namedNode('a'), dataFactory.namedNode('b'), dataFactory.namedNode('c'), dataFactory.defaultGraph()),
            dataFactory.quad(dataFactory.namedNode('a'), dataFactory.namedNode('d'), dataFactory.namedNode('e'), dataFactory.defaultGraph()),
            dataFactory.quad(dataFactory.namedNode('f'), dataFactory.namedNode('g'), dataFactory.namedNode('h'), dataFactory.defaultGraph()),
          ]);
          let response = test.createStreamCapture();
          before((done) => {
            settings.results = new AsyncIterator.TransformIterator();
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            settings.results.setProperty('metadata', { totalCount: 1234 });
            settings.results.source = results;
          });

          it('should write data and metadata', () => {
            response.buffer.should.equal(readAsset('basic-fragment'));
          });
        });

        describe('with a non-empty triple stream that writes metadata afterwards', () => {
          let results = AsyncIterator.fromArray([
            dataFactory.quad(dataFactory.namedNode('a'), dataFactory.namedNode('b'), dataFactory.namedNode('c'), dataFactory.defaultGraph()),
            dataFactory.quad(dataFactory.namedNode('a'), dataFactory.namedNode('d'), dataFactory.namedNode('e'), dataFactory.defaultGraph()),
            dataFactory.quad(dataFactory.namedNode('f'), dataFactory.namedNode('g'), dataFactory.namedNode('h'), dataFactory.defaultGraph()),
          ]);
          let response = test.createStreamCapture();
          before((done) => {
            settings.results = results;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            setImmediate(() => {
              results.setProperty('metadata', { totalCount: 1234 });
            });
          });

          it('should write data and metadata', () => {
            response.buffer.should.equal(readAsset('basic-fragment-metadata-last'));
          });
        });

        describe('with a query with a limit but no offset', () => {
          let results = AsyncIterator.empty();
          let settings = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100 },
          };
          let response = test.createStreamCapture();
          before((done) => {
            settings.results = results;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            results.setProperty('metadata', { totalCount: 1234 });
          });

          it('should write a first page link', () => {
            response.buffer.should.contain('myfirst');
          });

          it('should write a next page link', () => {
            response.buffer.should.contain('mynext');
          });

          it('should not write a previous page link', () => {
            response.buffer.should.not.contain('myprevious');
          });
        });

        describe('with a query with a limit and offset before the end', () => {
          let results = AsyncIterator.empty();
          let settings = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100, offset: 1133 },
          };
          let response = test.createStreamCapture();
          before((done) => {
            settings.results = results;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            results.setProperty('metadata', { totalCount: 1234 });
          });

          it('should write a first page link', () => {
            response.buffer.should.contain('myfirst');
          });

          it('should write a next page link', () => {
            response.buffer.should.contain('mynext');
          });

          it('should write a previous page link', () => {
            response.buffer.should.contain('myprevious');
          });
        });

        describe('with a query with a limit and offset past the end', () => {
          let results = AsyncIterator.empty();
          let settings = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100, offset: 1135 },
          };
          let response = test.createStreamCapture();
          before((done) => {
            settings.results = results;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            results.setProperty('metadata', { totalCount: 1234 });
          });

          it('should write a first page link', () => {
            response.buffer.should.contain('myfirst');
          });

          it('should not write a next page link', () => {
            response.buffer.should.not.contain('mynext');
          });

          it('should write a previous page link', () => {
            response.buffer.should.contain('myprevious');
          });
        });
      });
    });
  });
});
