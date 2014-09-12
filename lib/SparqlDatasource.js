/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A SparlDatasource fetches triples from a SPARQL endpoint */

var Datasource = require('./Datasource'),
    N3 = require('n3'),
    Cache = require('./Cache');

// Creates a new SparqlDatasource for the given endpoint
function SparqlDatasource(endpointUrl, defaultGraph) {
  this._endpointUrl = endpointUrl;
  this._defaultGraph = defaultGraph;
  this._limit = 100;
  this._countCache = new Cache(10000);
}

SparqlDatasource.prototype = {
  // Creates a SPARQL pattern for the given triple (falsy component means unknown)
  _createSparqlPattern: function (triple) {
    var query = ['{'], literalMatch;
    triple.subject   ? query.push('<', triple.subject,   '> ') : query.push('?s ');
    triple.predicate ? query.push('<', triple.predicate, '> ') : query.push('?p ');
    if (N3.Util.isUri(triple.object))
      query.push('<', triple.object, '>');
    else if (literalMatch = /^"([^]*)"(@[^"]+|\^\^[^"]+)?$/.exec(triple.object))
      query.push('"""', literalMatch[1].replace(/"/g, '\\"'), '"""', literalMatch[2]);
    else
      query.push('?o');
    query.push('}');
    return query.join('');
  },

  // Creates a CONSTRUCT query from the given pattern
  _createConstructQuery: function (pattern, offset, limit) {
    // Even though the SPARQL spec indicates that
    // LIMIT and OFFSET might be meaningless without ORDER BY,
    // this doesn't seem a problem in practice,
    // and sorting seems very slow. Therefore, don't sort.
    return ['CONSTRUCT', pattern, 'WHERE', pattern,
            'LIMIT', limit, 'OFFSET', offset].join(' ');
  },

  // Creates a SELECT COUNT(*) query from the given pattern
  _createCountQuery: function (pattern) {
    return ['SELECT COUNT(*)', 'WHERE', pattern].join(' ');
  },

  // Queries the SPARQL endpoint for the given triple pattern.
  _query: function (pattern, offset, limit, addTriple, setCount, done) {
    // Count the number of matching triples
    var sparqlPattern = this._createSparqlPattern(pattern);
    this._count(sparqlPattern, function (error, count) { error || setCount(count); });
    if (!addTriple) return done();

    // Fetch and parse matching triples
    var self = this, query = this._createConstructQuery(sparqlPattern, offset, limit),
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

  // Retrieves the (approximate) number of triples that match the (SPARQL) pattern
  _count: function (pattern, callback) {
    // Try to find a cache match
    var cache = this._countCache,
        sparqlPattern = typeof pattern === 'string' ? pattern : this._createSparqlPattern(pattern);
    if (sparqlPattern in cache)
      return callback(null, cache[sparqlPattern]);

    // Execute the count query
    var document = this.request({
      url: this._endpointUrl,
      qs: { 'default-graph-uri': this._defaultGraph, query: this._createCountQuery(sparqlPattern) },
      headers: { accept: 'text/turtle;q=1.0,text/ntriples;q=0.5,text/n3;q=0.3' },
      timeout: 7500,
    }, callback);
    document.on('error', callback);

    // Find the triple that contains the count
    this._parseTurtle(document, function (triple) {
      if (triple.predicate === 'http://www.w3.org/2005/sparql-results#value') {
        // Cache large values; small ones are calculated fast anyway
        var count = parseInt(N3.Util.getLiteralValue(triple.object), 10);
        if (count > 100000)
          cache[sparqlPattern] = count;
        callback(null, count);
        // We don't need to parse the reminder of the document
        document.abort();
      }
    }, callback);
  },

  // Parses the given Turtle fragment
  _parseTurtle: function (turtle, addTriple, done) {
    new N3.Parser().parse(turtle, function (error, triple) {
      triple ? addTriple(triple) : done(error);
    });
  },

  // Closes the data source
  close: function () {
    this._countCache.close();
  },
};
Datasource.extend(SparqlDatasource);

module.exports = SparqlDatasource;
