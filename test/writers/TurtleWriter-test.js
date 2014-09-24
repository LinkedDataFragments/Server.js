var TurtleWriter = require('../../lib/writers/TurtleWriter'),
    fs = require('fs'),
    path = require('path');

describe('TurtleWriter', function () {
  describe('The TurtleWriter module', function () {
    it('should be a function', function () {
      TurtleWriter.should.be.a('function');
    });

    it('should be a TurtleWriter constructor', function () {
      new TurtleWriter().should.be.an.instanceof(TurtleWriter);
    });

    it('should create new TurtleWriter objects', function () {
      TurtleWriter().should.be.an.instanceof(TurtleWriter);
    });
  });

  describe('A TurtleWriter instance', function () {
    var writer = new TurtleWriter();
    var writeSettings = {
      datasource: {
        url: 'http://ex.org/data',
        templateUrl: 'http://ex.org/data{?subject,predicate,object}',
      },
      fragment: {
        url: 'http://ex.org/data?fragment',
      },
      prefixes: {
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
        hydra: 'http://www.w3.org/ns/hydra/core#',
        voID: 'http://rdfs.org/ns/void#',
        dcTerms: 'http://purl.org/dc/terms/',
      },
    };

    describe('when writeFragment is called', function () {
      describe('with an empty triple stream', function () {
        var result = test.createStreamCapture();
        before(function () {
          writer.writeFragment(result, null, writeSettings);
        });

        it('should only write data source metadata', function () {
          result.buffer.should.equal(asset('empty-fragment.ttl'));
        });
      });
    });
  });
});

function asset(filename) {
  return fs.readFileSync(path.join(__dirname, '../assets/', filename), 'utf8');
}
