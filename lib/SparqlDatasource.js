/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A SparlDatasource fetches triples from a SPARQL endpoint */

var Datasource = require('./Datasource'),
    N3 = require('n3'),
    _ = require('lodash');

var LARGECOUNTESTIMATE = 500000000;

// Creates a new SparqlDatasource for the given endpoint
function SparqlDatasource(endpointUrl, defaultGraph) {
  this._endpointUrl = endpointUrl;
  this._defaultGraph = defaultGraph;
  this._limit = 100;
  this._countCache = {};
}

SparqlDatasource.prototype = {
  // Creates a SPARQL pattern for the given triple (falsy component means unknown)
  _createSparqlPattern: function (triple) {
    return ['{',
             triple.subject ? '<' + triple.subject + '>' : '?s',
             triple.predicate ? '<' + triple.predicate + '>' : '?p',
             N3.Util.isUri(triple.object) ? '<' + triple.object + '>' : (triple.object || '?o'),
           '}'].join(' ');
  },

  // Creates a CONSTRUCT query from the given pattern
  _createConstructQuery: function (pattern) {
    return ['CONSTRUCT', pattern, 'WHERE', pattern, 'LIMIT', this._limit].join(' ');
  },

  // Creates a SELECT COUNT(*) query from the given pattern
  _createCountQuery: function (pattern) {
    return ['SELECT COUNT(*)', 'WHERE', pattern].join(' ');
  },

  // Queries the SPARQL endpoint for the given triple pattern.
  query: function (pattern, addTriple, setCount, done) {
    // count the number of triples the match the pattern
    var sparqlPattern = this._createSparqlPattern(pattern);
    setCount && this._count(sparqlPattern, function (error, count) {
      setCount(error ? LARGECOUNTESTIMATE : count);
    });
    if (!addTriple) return done && done();

    // construct a request for triples that match the pattern
    // fetch and parse the resulting document
    var self = this, query = this._createConstructQuery(sparqlPattern),
        request = { url: this._endpointUrl,
          qs: { 'default-graph-uri': this._defaultGraph, query: query },
          headers: { accept: 'text/turtle;q=1.0,text/ntriples;q=0.5,text/n3;q=0.3' },
        },
        document = this.request(request, done);
    this._parseTurtle(document, addTriple, function (error) {
      // Virtuoso sometimes sends invalid Turtle, so try N-Triples.
      // We don't just accept N-Triples right away because it is slower,
      // and some Virtuoso versions don't support it and/or get conneg wrong.
      if (error && /Syntax error/.test(error.message || error)) {
        request.headers.accept = 'text/ntriples';
        document = self.request(request, done);
        return self._parseTurtle(document, addTriple, done);
      }
      done && done(error);
    });
  },

  // Retrieves the (approximate) number of triples that match the SPARQL pattern
  _count: function (sparqlPattern, callback) {
    // try to find a cache match
    var cache = this._countCache;
    if (sparqlPattern in cache)
      return callback(null, cache[sparqlPattern]);

    // execute the count query
    callback = _.once(callback);
    var document = this.request({
      url: this._endpointUrl,
      qs: { 'default-graph-uri': this._defaultGraph, query: this._createCountQuery(sparqlPattern) },
      headers: { accept: 'text/turtle;q=1.0,text/ntriples;q=0.5,text/n3;q=0.3' },
      timeout: 5000,
    }, callback);

    // find the triple that contains the count
    this._parseTurtle(document, function (triple) {
      if (triple.predicate === 'http://www.w3.org/2005/sparql-results#value') {
        // cache large values; small ones are calculated fast anyway
        var count = parseInt(N3.Util.getLiteralValue(triple.object), 10);
        if (count > 100000)
          cache[sparqlPattern] = count;
        callback(null, count);
        // we don't need to parse the reminder of the document
        document.abort();
      }
    },
    // return an approximation if no count triple was found
    function (error) { callback(error, error ? null : LARGECOUNTESTIMATE); });

    // return an approximation if counting takes too long
    setTimeout(function () { document.abort(); callback(null, LARGECOUNTESTIMATE); }, 2000);
  },

  // Parses the given Turtle fragment
  _parseTurtle: function (turtle, addTriple, done) {
    new N3.Parser().parse(turtle, function (error, triple) {
      triple ? addTriple(triple) : done(error);
    });
  },
};
Datasource.extend(SparqlDatasource);

module.exports = SparqlDatasource;
