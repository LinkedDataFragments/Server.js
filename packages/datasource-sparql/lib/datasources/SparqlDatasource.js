/*! @license MIT ©2014-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A SparqlDatasource provides queryable access to a SPARQL endpoint. */

var Datasource = require('@ldf/core').datasources.Datasource,
    N3 = require('n3'),
    LRU = require('lru-cache');

var DEFAULT_COUNT_ESTIMATE = { totalCount: 1e9, hasExactCount: false };
var ENDPOINT_ERROR = 'Error accessing SPARQL endpoint';
var INVALID_JSON_RESPONSE = 'The endpoint returned an invalid SPARQL results JSON response.';

// Creates a new SparqlDatasource
class SparqlDatasource extends Datasource {
  constructor(options) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);

    this._countCache = new LRU({ max: 1000, maxAge: 1000 * 60 * 60 * 3 });
    this._resolvingCountQueries = {};

    // Set endpoint URL and default graph
    options = options || {};
    this._endpoint = this._endpointUrl = (options.endpoint || '').replace(/[\?#][^]*$/, '');
    this._endpointUrl += '?query=';
  }
}

// Writes the results of the query to the given triple stream
SparqlDatasource.prototype._executeQuery = function (query, destination) {
  // Create the HTTP request
  var sparqlPattern = this._createQuadPattern(query), self = this,
      selectQuery = this._createSelectQuery(sparqlPattern, query.offset, query.limit),
      request = { url: this._endpointUrl + encodeURIComponent(selectQuery),
        headers: { accept: 'application/sparql-results+json' },
      };

  // Fetch and parse matching triples using JSON responses
  var json = '';
  this._request(request, emitError)
    .on('data', function (data) { json += data; })
    .on('error', emitError)
    .on('end', function () {
      var response;
      try { response = JSON.parse(json); }
      catch (e) { return emitError({ message: INVALID_JSON_RESPONSE }); }

      response.results.bindings.forEach(function (binding) {
        var triple = {
          subject:   binding.s ? self._parseJsonEntity(binding.s) : query.subject,
          predicate: binding.p ? self._parseJsonEntity(binding.p) : query.predicate,
          object:    binding.o ? self._parseJsonEntity(binding.o) : query.object,
          graph:     binding.g ? self._parseJsonEntity(binding.g) : query.graph,
        };
        destination._push(triple);
      });
      destination.close();
    });

  // Determine the total number of matching triples
  this._getPatternCount(sparqlPattern).then(function (count) {
    destination.setProperty('metadata', count);
  },
  emitError);

  // Emits an error on the triple stream
  var errored = false;
  function emitError(error) {
    if (!error || errored) return;
    errored = true;
    destination.emit('error', new Error(ENDPOINT_ERROR + ' ' + self._endpoint + ': ' + error.message));
  }
};

// Retrieves the (approximate) number of triples that match the SPARQL pattern
SparqlDatasource.prototype._getPatternCount = function (sparqlPattern) {
  // Try to find a cache match
  var cache = this._countCache, count = cache.get(sparqlPattern);
  if (count)
    return Promise.resolve({ totalCount: count, hasExactCount: true });

  // Immediately return the fallback URL if a count is already going on.
  if (this._resolvingCountQueries[sparqlPattern])
    return Promise.resolve(DEFAULT_COUNT_ESTIMATE);

  // Execute the count query
  var countResponse = this._request({
    url: this._endpointUrl + encodeURIComponent(this._createCountQuery(sparqlPattern)),
    headers: { accept: 'text/csv' },
    timeout: 10000,
  });

  // Parse SPARQL response in CSV format (2 lines: variable name / count value)
  var self = this;
  return new Promise(function (resolve, reject) {
    var csv = '';
    self._resolvingCountQueries[sparqlPattern] = true;
    countResponse.on('data', function (data) { csv += data; });
    countResponse.on('end', function () {
      delete self._resolvingCountQueries[sparqlPattern];
      var countMatch = csv.match(/\d+/);
      if (!countMatch)
        reject(new Error('COUNT query failed.'));
      else {
        var count = parseInt(countMatch[0], 10);
        // Cache large values; small ones are calculated fast anyway
        if (count > 100000)
          cache.set(sparqlPattern, count);
        resolve({ totalCount: count, hasExactCount: true });
      }
    });
    // If the response errors, use an arbitrarily high number as count
    countResponse.on('error', resolveToDefault);
    function resolveToDefault() { resolve(DEFAULT_COUNT_ESTIMATE); }
    // When no result arrives in time, send a default count
    // (the correct result might still end up in the cache for future use)
    setTimeout(resolveToDefault, 3000);
  });
};

// Creates a SELECT query from the given SPARQL pattern
SparqlDatasource.prototype._createSelectQuery =  function (sparqlPattern, offset, limit) {
  var query = ['SELECT * WHERE', sparqlPattern];
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
  return 'SELECT (COUNT(*) AS ?c) WHERE ' + sparqlPattern;
};

// Creates a SPARQL pattern for the given triple pattern
SparqlDatasource.prototype._createQuadPattern = function (quad) {
  var query = ['{'], literalMatch;

  // Encapsulate in graph if we are not querying the default graph
  if (quad.graph !== '') {
    query.push('GRAPH ');
    quad.graph ? query.push('<', quad.graph, '>') : query.push('?g');
    query.push('{');
  }

  // Add a possible subject IRI
  quad.subject ? query.push('<', quad.subject, '> ') : query.push('?s ');

  // Add a possible predicate IRI
  quad.predicate ? query.push('<', quad.predicate, '> ') : query.push('?p ');

  // Add a possible object IRI or literal
  if (N3.Util.isIRI(quad.object))
    query.push('<', quad.object, '>');
  else if (!(literalMatch = /^"([^]*)"(?:(@[^"]+)|\^\^([^"]+))?$/.exec(quad.object)))
    query.push('?o');
  else {
    if (!/["\\]/.test(literalMatch[1]))
      query.push('"', literalMatch[1], '"');
    else
      query.push('"""', literalMatch[1].replace(/(["\\])/g, '\\$1'), '"""');
    literalMatch[2] ? query.push(literalMatch[2])
                    : literalMatch[3] && query.push('^^<', literalMatch[3], '>');
  }

  if (quad.graph !== '')
    query.push('}');

  return query.push('}'), query.join('');
};

// Parses an entity from a JSON SPARQL response
SparqlDatasource.prototype._parseJsonEntity = function (entity) {
  if (entity.type === 'literal') {
    var suffixes = '';
    if (entity.datatype)
      suffixes += '^^<' + entity.datatype + '>';
    if (entity['xml:lang'])
      suffixes += '@' + entity['xml:lang'];
    return '"' + entity.value + '"' + suffixes;
  }
  return entity.value;
};

module.exports = SparqlDatasource;
