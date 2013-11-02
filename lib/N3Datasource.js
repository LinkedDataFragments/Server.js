// A SparlDatasource fetches triples from a SPARQL endpoint

var request = require('request'),
    q = require('q'),
    N3Parser = require('n3').Parser;

// Creates a new SparqlDatasource for the given endpoint
function N3Datasource(url) {
  this._url = url;
}

N3Datasource.prototype = {

  // Queries the file for the given triple pattern
  // Returns a promise for a result object
  query: function (subject, predicate, object) {
    var self = this;
    this._pattern = { subject: subject, predicate: predicate, object: object };
    // construct the (first few) triples that match the specified pattern
    var triples = this._parseTurtle(request({
      url: this._url,
      headers: { accept: 'text/turtle' },
    }));

    // return a promise to the combined triples/count object
    return q.all([triples]).spread(function (triples) {
      var count = triples.length;
      var pattern = self._pattern.s + " " + self._pattern.p + " " + self._pattern.o + " " + ".";
      return { triples: triples, count: count, pattern: pattern };
    });
  },

  // Parses the given Turtle fragment, returning a promise for triples that match the pattern
  _parseTurtle: function (turtlestream) {
    var pattern = this._pattern,
        deferred = q.defer(),
        triples = [];
    var self = this;
    new N3Parser().parse(turtlestream, function (error, triple) {
      if (error)
        deferred.reject(new Error(error));
      else if (triple) {
        // filter matching triples
        if ((!pattern.subject   || pattern.subject   === triple.subject) &&
            (!pattern.predicate || pattern.predicate === triple.predicate) &&
            (!pattern.object    || pattern.object    === triple.object)) {
          triples.push(triple);
        }
      }
      else {
        // no triple means everything has been parsed
        deferred.resolve(triples);
      }
    });
    return deferred.promise;
  },
};

module.exports = N3Datasource;
