// A SparlDatasource fetches triples from a SPARQL endpoint

var request = require('request'),
    q = require('q'),
    _ = require('lodash'),
    N3Parser = require('n3').Parser;

// Creates a new SparqlDatasource for the given endpoint
function SparqlDatasource(endpointUrl, defaultGraph) {
  this._endpointUrl = endpointUrl;
  this._defaultGraph = defaultGraph;
  this._limit = 100;
}

SparqlDatasource.prototype = {
  // Creates a SPARQL pattern for the given triple (falsy component means unknown)
  _createPattern: function (subject, predicate, object) {
    return ['{', subject || '?s', predicate || '?p', object || '?o', '}'].join(' ');
  },

  // Creates a CONSTRUCT query from the given pattern
  _createConstructQuery: function (pattern) {
    return ['CONSTRUCT', pattern, 'WHERE', pattern, 'LIMIT', this._limit].join(' ');
  },

  // Creates a SELECT COUNT(*) query from the given pattern
  _createCountQuery: function (pattern) {
    return ['SELECT COUNT(*)', 'WHERE', pattern].join(' ');
  },

  // Performs the specified HTTP request, returning a promise
  _performRequest: function (options) {
    var deferred = q.defer();
    request(options, function (error, response, body) {
      if (error)
        deferred.reject(new Error(error));
      else if (response.statusCode !== 200)
        deferred.reject(new Error(body));
      else
        deferred.resolve(body);
    });
    return deferred.promise;
  },

  // Queries the SPARQL endpoint for the given triple pattern (falsy component means unknown)
  // Returns a promise for a result object
  query: function (subject, predicate, object) {
    var pattern = this._createPattern(subject, predicate, object);

    // construct the (first few) triples that match the specified pattern
    var triples = this._performRequest({
      url: this._endpointUrl,
      qs: { 'default-graph-uri': this._defaultGraph, query: this._createConstructQuery(pattern) },
      headers: { accept: 'text/n3' },
    }).then(parseTurtle);

    // count all triples that match the specified pattern
    var count = this._performRequest({
      url: this._endpointUrl,
      qs: { 'default-graph-uri': this._defaultGraph, query: this._createCountQuery(pattern) },
      headers: { accept: 'text/n3' },
      timeout: 1000,
    }).then(parseTurtle)
    // Find the count value triple and parse its numeric value
    .then(function (triples) {
      var resultTriple = _.find(triples, { predicate: 'http://www.w3.org/2005/sparql-results#value' });
      return resultTriple ? parseInt(/\d+/.exec(resultTriple.object)[0], 10) : 0;
    },
    // In case no timely answer was found, just return a large number (approximate count is sufficient)
    function (error) { return Math.pow(2, 32); });

    // return a promise to the combined triples/count object
    return q.all([triples, count]).spread(function (triples, count) {
      return { triples: triples, count: count, pattern: pattern };
    });
  },
};

// Parses the given Turtle fragment, returning a promise for triples
function parseTurtle(turtle) {
  var deferred = q.defer(),
      triples = [];
  new N3Parser().parse(turtle, function (error, triple) {
    if (error)
      deferred.reject(new Error(error));
    else if (triple)
      triples.push(triple);
    else
      // no triple means everything has been parsed
      deferred.resolve(triples);
  });
  return deferred.promise;
}

module.exports = SparqlDatasource;
