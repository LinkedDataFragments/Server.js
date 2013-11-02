/*! @license ©2013 Pieter Colpaert - Multimedia Lab / iMinds / Ghent University */

/** An N3Datasource fetches triples from an N3 document */

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
  query: function (pattern) {
    var self = this;
    // construct the (first few) triples that match the specified pattern
    return this._parseTurtle(request({
      url: this._url,
      headers: { accept: 'text/turtle' },
    }), pattern)
    // return a promise to the combined triples/count object
    .then(function (triples) {
      return { triples: triples, total: triples.length };
    });
  },

  // Parses the given Turtle fragment, returning a promise for triples that match the pattern
  _parseTurtle: function (turtlestream, pattern) {
    var deferred = q.defer(),
        triples = [];
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
