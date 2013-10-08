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
    //TODO: expand prefixes
    this._triple = {
      s : subject || "",
      p : predicate || "",
      o : object || ""
    };
    var self = this;
    // construct the (first few) triples that match the specified pattern
    var triples = this._parseTurtle(request({
      url: this._url,
      headers: { accept: 'text/turtle' },
    }));

    // return a promise to the combined triples/count object
    return q.all([triples]).spread(function (triples) {
      var count = triples.length;
      var pattern = self._triple.s + " " + self._triple.p + " " + self._triple.o + " " + ".";
      return { triples: triples, count: count, pattern: pattern };
    });
  },

  // Parses the given Turtle fragment, returning a promise for triples that match the pattern
  _parseTurtle: function (turtlestream) {
    var deferred = q.defer(),
    triples = [];
    var self = this;
    new N3Parser().parse(turtlestream, function (error, triple) {
      if (error)
        deferred.reject(new Error(error));
      else if (triple) {
        if ((self._triple.s === "" || self._triple.s === "<" + triple.subject + ">") &&
            (self._triple.p === "" || self._triple.p === "<" + triple.predicate + ">") &&
            (self._triple.o === "" || self._triple.o.substr(1, self._triple.o.length - 2) === triple.object || self._triple.o === triple.object)) {
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
