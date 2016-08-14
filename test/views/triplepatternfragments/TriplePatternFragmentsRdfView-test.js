/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var TriplePatternFragmentsRdfView = require('../../../lib/views/triplepatternfragments/TriplePatternFragmentsRdfView');

var _ = require('lodash'),
    fs = require('fs'),
    path = require('path');

describe('TriplePatternFragmentsRdfView', function () {
  describe('The TriplePatternFragmentsRdfView module', function () {
    it('should be a function', function () {
      TriplePatternFragmentsRdfView.should.be.a('function');
    });

    it('should be a TriplePatternFragmentsRdfView constructor', function () {
      new TriplePatternFragmentsRdfView().should.be.an.instanceof(TriplePatternFragmentsRdfView);
    });

    it('should create new TriplePatternFragmentsRdfView objects', function () {
      TriplePatternFragmentsRdfView().should.be.an.instanceof(TriplePatternFragmentsRdfView);
    });
  });

  describe('A TriplePatternFragmentsRdfView instance', function () {
    var view = new TriplePatternFragmentsRdfView();
    var settings = {
      datasource: {
        title: 'My data',
        index: 'http://ex.org/#dataset',
        url: 'http://ex.org/data#dataset',
        templateUrl: 'http://ex.org/data{?subject,predicate,object}',
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
        patternString: '{ a ?b ?c }',
      },
    };

    _.each({
      'text/turtle': 'ttl',
      'application/trig': 'trig',
      'application/n-triples': 'nt',
      'application/n-quads': 'nq',
      'application/ld+json': 'jsonld',
    },
    function (extension, format) {
      describe('when render is called for ' + format, function () {
        function readAsset(name) {
          var file = path.join(__dirname, '../../assets/', name + '.' + extension);
          return fs.readFileSync(file, 'utf8');
        }

        describe('with an empty triple stream', function () {
          var resultStream = test.streamFromArray([]);
          var response = test.createStreamCapture();
          before(function (done) {
            settings.resultStream = resultStream;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            resultStream.emit('metadata', { totalCount: 1234 });
          });

          it('should only write data source metadata', function () {
            response.buffer.should.equal(readAsset('empty-fragment'));
          });
        });

        describe('with a non-empty triple stream that writes metadata first', function () {
          var resultStream = test.streamFromArray([
            { subject: 'a', predicate: 'b', object: 'c' },
            { subject: 'a', predicate: 'd', object: 'e' },
            { subject: 'f', predicate: 'g', object: 'h' },
          ]);
          resultStream.pause();
          var response = test.createStreamCapture();
          before(function (done) {
            settings.resultStream = resultStream;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            resultStream.emit('metadata', { totalCount: 1234 });
            resultStream.resume();
          });

          it('should write data and metadata', function () {
            response.buffer.should.equal(readAsset('basic-fragment'));
          });
        });

        describe('with a non-empty triple stream that writes metadata afterwards', function () {
          var resultStream = test.streamFromArray([
            { subject: 'a', predicate: 'b', object: 'c' },
            { subject: 'a', predicate: 'd', object: 'e' },
            { subject: 'f', predicate: 'g', object: 'h' },
          ]);
          var response = test.createStreamCapture();
          before(function (done) {
            settings.resultStream = resultStream;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            setImmediate(function () {
              resultStream.emit('metadata', { totalCount: 1234 });
            });
          });

          it('should write data and metadata', function () {
            response.buffer.should.equal(readAsset('basic-fragment-metadata-last'));
          });
        });

        describe('with a query with a limit but no offset', function () {
          var resultStream = test.streamFromArray([]);
          var settings = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100 },
          };
          var response = test.createStreamCapture();
          before(function (done) {
            settings.resultStream = resultStream;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            resultStream.emit('metadata', { totalCount: 1234 });
          });

          it('should write a first page link', function () {
            response.buffer.should.contain('myfirst');
          });

          it('should write a next page link', function () {
            response.buffer.should.contain('mynext');
          });

          it('should not write a previous page link', function () {
            response.buffer.should.not.contain('myprevious');
          });
        });

        describe('with a query with a limit and offset before the end', function () {
          var resultStream = test.streamFromArray([]);
          var settings = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100, offset: 1133 },
          };
          var response = test.createStreamCapture();
          before(function (done) {
            settings.resultStream = resultStream;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            resultStream.emit('metadata', { totalCount: 1234 });
          });

          it('should write a first page link', function () {
            response.buffer.should.contain('myfirst');
          });

          it('should write a next page link', function () {
            response.buffer.should.contain('mynext');
          });

          it('should write a previous page link', function () {
            response.buffer.should.contain('myprevious');
          });
        });

        describe('with a query with a limit and offset past the end', function () {
          var resultStream = test.streamFromArray([]);
          var settings = {
            datasource: { },
            fragment: {
              pageUrl:         'mypage',
              firstPageUrl:    'myfirst',
              nextPageUrl:     'mynext',
              previousPageUrl: 'myprevious',
            },
            query: { limit: 100, offset: 1135 },
          };
          var response = test.createStreamCapture();
          before(function (done) {
            settings.resultStream = resultStream;
            response.getHeader = sinon.stub().returns(format);
            view.render(settings, {}, response, done);
            resultStream.emit('metadata', { totalCount: 1234 });
          });

          it('should write a first page link', function () {
            response.buffer.should.contain('myfirst');
          });

          it('should not write a next page link', function () {
            response.buffer.should.not.contain('mynext');
          });

          it('should write a previous page link', function () {
            response.buffer.should.contain('myprevious');
          });
        });
      });
    });
  });
});
