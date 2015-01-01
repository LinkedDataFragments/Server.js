var NTriplesWriter = require('../../lib/writers/NTriplesWriter'),
    fs = require('fs'),
    path = require('path');

describe('NTriplesWriter', function () {
  describe('The NTriplesWriter module', function () {
    it('should be a function', function () {
      NTriplesWriter.should.be.a('function');
    });

    it('should be a NTriplesWriter constructor', function () {
      new NTriplesWriter().should.be.an.instanceof(NTriplesWriter);
    });

    it('should create new NTriplesWriter objects', function () {
      NTriplesWriter().should.be.an.instanceof(NTriplesWriter);
    });
  });

  describe('A NTriplesWriter instance', function () {
    var writer = new NTriplesWriter();
    var writeSettings = {
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

    describe('when writeFragment is called', function () {
      describe('with an empty triple stream', function () {
        var tripleStream = test.streamFromArray([]);
        var result = test.createStreamCapture();
        before(function (done) {
          writer.writeFragment(result, tripleStream, writeSettings);
          tripleStream.emit('metadata', { totalCount: 1234 });
          result.on('finish', done);
        });

        it('should only write data source metadata', function () {
          result.buffer.should.equal(asset('empty-fragment.nt'));
        });
      });

      describe('with a non-empty triple stream that writes metadata first', function () {
        var tripleStream = test.streamFromArray([
          { subject: 'a', predicate: 'b', object: 'c' },
          { subject: 'a', predicate: 'd', object: 'e' },
          { subject: 'f', predicate: 'g', object: 'h' },
        ]);
        tripleStream.pause();
        var result = test.createStreamCapture();
        before(function (done) {
          writer.writeFragment(result, tripleStream, writeSettings);
          tripleStream.emit('metadata', { totalCount: 1234 });
          tripleStream.resume();
          result.on('finish', done);
        });

        it('should write data and metadata', function () {
          result.buffer.should.equal(asset('basic-fragment.nt'));
        });
      });

      describe('with a non-empty triple stream that writes metadata afterwards', function () {
        var tripleStream = test.streamFromArray([
          { subject: 'a', predicate: 'b', object: 'c' },
          { subject: 'a', predicate: 'd', object: 'e' },
          { subject: 'f', predicate: 'g', object: 'h' },
        ]);
        var result = test.createStreamCapture();
        before(function () {
          writer.writeFragment(result, tripleStream, writeSettings);
          setImmediate(function () {
            tripleStream.emit('metadata', { totalCount: 1234 });
          });
        });

        it('should write data and metadata', function () {
          result.buffer.should.equal(asset('basic-fragment-metadata-last.nt'));
        });
      });

      describe('with a query with a limit but no offset', function () {
        var tripleStream = test.streamFromArray([]);
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
        var result = test.createStreamCapture();
        before(function (done) {
          writer.writeFragment(result, tripleStream, settings);
          tripleStream.emit('metadata', { totalCount: 1234 });
          result.on('finish', done);
        });

        it('should write a first page link', function () {
          result.buffer.should.contain('myfirst');
        });

        it('should write a next page link', function () {
          result.buffer.should.contain('mynext');
        });

        it('should not write a previous page link', function () {
          result.buffer.should.not.contain('myprevious');
        });
      });

      describe('with a query with a limit and offset before the end', function () {
        var tripleStream = test.streamFromArray([]);
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
        var result = test.createStreamCapture();
        before(function (done) {
          writer.writeFragment(result, tripleStream, settings);
          tripleStream.emit('metadata', { totalCount: 1234 });
          result.on('finish', done);
        });

        it('should write a first page link', function () {
          result.buffer.should.contain('myfirst');
        });

        it('should write a next page link', function () {
          result.buffer.should.contain('mynext');
        });

        it('should write a previous page link', function () {
          result.buffer.should.contain('myprevious');
        });
      });

      describe('with a query with a limit and offset past the end', function () {
        var tripleStream = test.streamFromArray([]);
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
        var result = test.createStreamCapture();
        before(function (done) {
          writer.writeFragment(result, tripleStream, settings);
          tripleStream.emit('metadata', { totalCount: 1234 });
          result.on('finish', done);
        });

        it('should write a first page link', function () {
          result.buffer.should.contain('myfirst');
        });

        it('should not write a next page link', function () {
          result.buffer.should.not.contain('mynext');
        });

        it('should write a previous page link', function () {
          result.buffer.should.contain('myprevious');
        });
      });
    });
  });
});

function asset(filename) {
  return fs.readFileSync(path.join(__dirname, '../assets/', filename), 'utf8');
}
