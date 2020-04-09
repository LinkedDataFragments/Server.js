/*! @license MIT ©2014-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A SparqlDatasource provides queryable access to a SPARQL endpoint. */

let Datasource = require('@ldf/core').datasources.Datasource,
    SparqlJsonParser = require('sparqljson-parse').SparqlJsonParser,
    LRU = require('lru-cache');

let DEFAULT_COUNT_ESTIMATE = { totalCount: 1e9, hasExactCount: false };
let ENDPOINT_ERROR = 'Error accessing SPARQL endpoint';
let INVALID_JSON_RESPONSE = 'The endpoint returned an invalid SPARQL results JSON response.';
const xsd  = 'http://www.w3.org/2001/XMLSchema#';

// Creates a new SparqlDatasource
class SparqlDatasource extends Datasource {
  constructor(options) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);

    this._countCache = new LRU({ max: 1000, maxAge: 1000 * 60 * 60 * 3 });
    this._resolvingCountQueries = {};
    this._sparqlJsonParser = new SparqlJsonParser({ dataFactory: this.dataFactory });

    // Set endpoint URL and default graph
    options = options || {};
    this._endpoint = this._endpointUrl = (options.endpoint || '').replace(/[\?#][^]*$/, '');
    this._endpointUrl += '?query=';

    this._forceTypedLiterals = options.forceTypedLiterals;
  }

  // Writes the results of the query to the given triple stream
  _executeQuery(query, destination) {
    // Create the HTTP request
    let sparqlPattern = this._createQuadPattern(query), self = this,
        selectQuery = this._createSelectQuery(sparqlPattern, query.offset, query.limit),
        request = { url: this._endpointUrl + encodeURIComponent(selectQuery),
          headers: { accept: 'application/sparql-results+json' },
        };

    // Fetch and parse matching triples using JSON responses
    let json = '';
    this._request(request, emitError)
      .on('data', (data) => { json += data; })
      .on('error', emitError)
      .on('end', () => {
        let response;
        try { response = JSON.parse(json); }
        catch (e) { return emitError({ message: INVALID_JSON_RESPONSE }); }

        response.results.bindings.forEach((binding) => {
          binding = this._sparqlJsonParser.parseJsonBindings(binding);
          let triple = {
            subject:   binding.s || query.subject,
            predicate: binding.p || query.predicate,
            object:    binding.o || query.object,
            graph:     binding.g || query.graph,
          };
          destination._push(triple);
        });
        destination.close();
      });

    // Determine the total number of matching triples
    this._getPatternCount(sparqlPattern).then((count) => {
      destination.setProperty('metadata', count);
    },
    emitError);

    // Emits an error on the triple stream
    let errored = false;
    function emitError(error) {
      if (!error || errored) return;
      errored = true;
      destination.emit('error', new Error(ENDPOINT_ERROR + ' ' + self._endpoint + ': ' + error.message));
    }
  }

  // Retrieves the (approximate) number of triples that match the SPARQL pattern
  _getPatternCount(sparqlPattern) {
    // Try to find a cache match
    let cache = this._countCache, count = cache.get(sparqlPattern);
    if (count)
      return Promise.resolve({ totalCount: count, hasExactCount: true });

    // Immediately return the fallback URL if a count is already going on.
    if (this._resolvingCountQueries[sparqlPattern])
      return Promise.resolve(DEFAULT_COUNT_ESTIMATE);

    // Execute the count query
    let countResponse = this._request({
      url: this._endpointUrl + encodeURIComponent(this._createCountQuery(sparqlPattern)),
      headers: { accept: 'text/csv' },
      timeout: 10000,
    });

    // Parse SPARQL response in CSV format (2 lines: variable name / count value)
    return new Promise((resolve, reject) => {
      let csv = '';
      this._resolvingCountQueries[sparqlPattern] = true;
      countResponse.on('data', (data) => { csv += data; });
      countResponse.on('end', () => {
        delete this._resolvingCountQueries[sparqlPattern];
        let countMatch = csv.match(/\d+/);
        if (!countMatch)
          reject(new Error('COUNT query failed.'));
        else {
          let count = parseInt(countMatch[0], 10);
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
  }

  // Creates a SELECT query from the given SPARQL pattern
  _createSelectQuery(sparqlPattern, offset, limit) {
    let query = ['SELECT * WHERE', sparqlPattern];
    // Even though the SPARQL spec indicates that
    // LIMIT and OFFSET might be meaningless without ORDER BY,
    // this doesn't seem a problem in practice.
    // Furthermore, sorting can be slow. Therefore, don't sort.
    limit  && query.push('LIMIT',  limit);
    offset && query.push('OFFSET', offset);
    return query.join(' ');
  }

  // Creates a SELECT COUNT(*) query from the given SPARQL pattern
  _createCountQuery(sparqlPattern) {
    return 'SELECT (COUNT(*) AS ?c) WHERE ' + sparqlPattern;
  }

  // Creates a SPARQL pattern for the given triple pattern
  _createQuadPattern(quad) {
    let query = ['{'];

    // Encapsulate in graph if we are not querying the default graph
    if (!quad.graph || quad.graph.termType !== 'DefaultGraph') {
      query.push('GRAPH ');
      quad.graph ? query.push(this._encodeObject(quad.graph)) : query.push('?g');
      query.push('{');
    }

    // Add a possible subject IRI
    quad.subject ? query.push(this._encodeObject(quad.subject) + ' ') : query.push('?s ');

    // Add a possible predicate IRI
    quad.predicate ? query.push(this._encodeObject(quad.predicate) + ' ') : query.push('?p ');

    // Add a possible object IRI
    quad.object ? query.push(this._encodeObject(quad.object)) : query.push('?o');

    if (!quad.graph || quad.graph.termType !== 'DefaultGraph')
      query.push('}'); // close the GRAPH brackets

    return query.push('}'), query.join('');
  }

  _encodeObject(term) {
    switch (term.termType) {
    case 'NamedNode':
      return '<' + term.value + '>';
    case 'BlankNode':
      return '_:' + term.value;
    case 'Variable':
      return '?' + term.value;
    case 'DefaultGraph':
      return '';
    case 'Literal':
      return this._convertLiteral(term);
    default:
      return null;
    }
  }

  _convertLiteral(term) {
    if (!term)
      return '?o';
    else {
      return ((!/["\\]/.test(term.value)) ?  '"' + term.value + '"' : '"""' + term.value.replace(/(["\\])/g, '\\$1') + '"""') +
        (term.language ? '@' + term.language :
          (term.datatype && term.datatype.value !== xsd + 'string' ? '^^' + this._encodeObject(term.datatype) : this._forceTypedLiterals ? '^^<http://www.w3.org/2001/XMLSchema#string>' : ''));
    }
  }
}

module.exports = SparqlDatasource;
