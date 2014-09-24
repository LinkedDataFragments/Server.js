/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A SparqlDatasource provides queryable access to a SPARQL endpoint. */

var Datasource = require('./Datasource'),
    N3 = require('n3'),
    LRU = require('lru-cache'),
    Readable = require('stream').Readable;

// Creates a new SparqlDatasource
function SparqlDatasource(endpointUrl, options) {
  if (!(this instanceof SparqlDatasource))
    return new SparqlDatasource(endpointUrl, options);
  Datasource.call(this, options);
  this._countCache = LRU({ max: 1000, maxAge: 1000 * 60 * 60 * 3 });

  // Set endpoint URL and default graph
  options = options || {};
  endpointUrl = (endpointUrl || '').replace(/\?.*$/, '');
  if (options.defaultGraph)
    endpointUrl += '?default-graph-uri=' + encodeURIComponent(options.defaultGraph);
  this._endpointUrl = endpointUrl + (options.defaultGraph ? '&query=' : '?query=');
}
Datasource.extend(SparqlDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Creates a triple stream for the given query
SparqlDatasource.prototype._createTripleStream = function (query) {
  // Create the HTTP request
  var sparqlPattern = this._createTriplePattern(query),
      constructQuery = this._createConstructQuery(sparqlPattern, query.offset, query.limit),
      request = { url: this._endpointUrl + encodeURIComponent(constructQuery),
        headers: { accept: 'text/turtle;q=1.0,text/ntriples;q=0.5,text/n3;q=0.3' },
      };

  // Fetch and parse matching triples
  N3.Parser().parse(this._request(request, emitError), function (error, triple) {
    if (!error)
      tripleStream.push(triple || null);
    // Virtuoso sometimes sends invalid Turtle, so try N-Triples.
    // We don't just accept N-Triples right away because it is slower,
    // and some Virtuoso versions don't support it and/or get conneg wrong.
    else if (/Syntax error/.test(error.message)) {
      request.headers.accept = 'text/ntriples';
      return N3.Parser().parse(self._request(request, emitError), function (error, triple) {
        error ? emitError(error) : tripleStream.push(triple || null);
      });
    }
  });

  // Emit the total number of matching triples through the `count` event
  this._getPatternCount(sparqlPattern, function (error, count) {
    typeof count === 'number' && tripleStream.emit('count', count);
  });

  // Create and return the output stream
  var tripleStream = new Readable({ objectMode: true }), self = this;
  tripleStream._read = noop;
  function emitError(error) { error && tripleStream.emit('error', error); }
  return tripleStream;
};

// Retrieves the (approximate) number of triples that match the SPARQL pattern
SparqlDatasource.prototype._getPatternCount = function (sparqlPattern, callback) {
  // Try to find a cache match
  var cache = this._countCache, count = cache.get(sparqlPattern);
  if (count) return setImmediate(callback, null, count);

  // Execute the count query
  var document = this._request({
    url: this._endpointUrl + encodeURIComponent(this._createCountQuery(sparqlPattern)),
    headers: { accept: 'text/turtle;q=1.0,text/ntriples;q=0.5,text/n3;q=0.3' },
    timeout: 7500,
  }, callback);
  document.on('error', callback);

  // Find the triple that contains the count
  N3.Parser().parse(document, function (error, triple) {
    if (triple && triple.predicate === 'http://www.w3.org/2005/sparql-results#value') {
      // If a count is found, we don't need to parse the reminder of the document
      document.abort();
      // Cache large values; small ones are calculated fast anyway
      count = parseInt(N3.Util.getLiteralValue(triple.object), 10);
      if (count > 100000) cache.set(sparqlPattern, count);
      callback(null, count);
    }
  });
};


// Creates a CONSTRUCT query from the given SPARQL pattern
SparqlDatasource.prototype._createConstructQuery =  function (sparqlPattern, offset, limit) {
  var query = ['CONSTRUCT', sparqlPattern, 'WHERE', sparqlPattern];
  // Even though the SPARQL spec indicates that
  // LIMIT and OFFSET might be meaningless without ORDER BY,
  // this doesn't seem a problem in practice.
  // Furthermore, sorting can be slow. Therefore, don't sort.
  limit  && query.push('LIMIT',  limit);
  offset && query.push('OFFSET', offset);
  return query.join(' ');
};

// Creates a SELECT COUNT(*) query from the given SPARQL pattern
SparqlDatasource.prototype._createCountQuery = function (sparqlPattern) {
  return ['SELECT COUNT(*)', 'WHERE', sparqlPattern].join(' ');
};

// Creates a SPARQL pattern for the given triple pattern
SparqlDatasource.prototype._createTriplePattern = function (triple) {
  var query = ['{'], literalMatch;

  // Add a possible subject IRI
  triple.subject ? query.push('<', triple.subject, '> ') : query.push('?s ');

  // Add a possible predicate IRI
  triple.predicate ? query.push('<', triple.predicate, '> ') : query.push('?p ');

  // Add a possible object IRI or literal
  if (N3.Util.isUri(triple.object))
    query.push('<', triple.object, '>');
  else if (!(literalMatch = /^"([^]*)"(?:(@[^"]+)|\^\^([^"]+))?$/.exec(triple.object)))
    query.push('?o');
  else {
    if (!/["\\]/.test(literalMatch[1]))
      query.push('"', literalMatch[1], '"');
    else
      query.push('"""', literalMatch[1].replace(/(["\\])/g, '\\$1'), '"""');
    literalMatch[2] ? query.push(literalMatch[2]) :
    literalMatch[3] && query.push('^^<', literalMatch[3], '>');
  }

  return query.push('}'), query.join('');
};

// The empty function
function noop() {}

module.exports = SparqlDatasource;
