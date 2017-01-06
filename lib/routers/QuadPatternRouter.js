/*! @license MIT ©2014–17 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/** A QuadPatternRouter routes basic quad patterns */

var iriMatcher = /^(<?)([^_?$"<>][^"<>]*)>?$/;
var literalMatcher = /^("[^]*")(?:|\^\^<?([^"<>]+)>?|@[a-z0-9\-]+)$/i;
var prefixedNameMatcher = /^([a-z0-9\-]*):([^\/#:]*)$/i;

// Clients use `DEFAULT_GRAPH` as value for `graph` to indicate the default graph
var DEFAULT_GRAPH = 'urn:ldf:defaultGraph';
// However, users might find "@default" easier to type (not spec-compatible)
var DEFAULT_GRAPH_ALT = '@default';

// Creates a new QuadPatternRouter
function QuadPatternRouter(config) {
  if (!(this instanceof QuadPatternRouter))
    return new QuadPatternRouter(config);
  this._prefixes = config && config.prefixes || {};
}

// Extracts triple or quad pattern parameters from the request and add them to the query
QuadPatternRouter.prototype.extractQueryParams = function (request, query) {
  var queryString = request.url && request.url.query, match,
      hasTriplePattern = false, hasQuadPattern = false;

  // Try to extract a subject IRI
  if (queryString.subject && (match = iriMatcher.exec(queryString.subject)))
    hasTriplePattern = query.subject = match[1] ? match[2] : this._expandIRI(match[2]);

  // Try to extract a predicate IRI
  if (queryString.predicate && (match = iriMatcher.exec(queryString.predicate)))
    hasTriplePattern = query.predicate = match[1] ? match[2] : this._expandIRI(match[2]);

  // Try to extract an object
  if (queryString.object) {
    // The object can be an IRI…
    if (match = iriMatcher.exec(queryString.object))
      hasTriplePattern = query.object = match[1] ? match[2] : this._expandIRI(match[2]);
    // or the object can be a literal (with a type or language)
    else if (match = literalMatcher.exec(queryString.object))
      hasTriplePattern = query.object = match[2] ? match[1] + '^^' + this._expandIRI(match[2]) : match[0];
  }

  // Try to extract a graph IRI
  if (queryString.graph && (match = iriMatcher.exec(queryString.graph))) {
    hasTriplePattern = false;
    hasQuadPattern = match[1] ? match[2] : this._expandIRI(match[2]);
    // When a client specifies DEFAULT_GRAPH as graph,
    // we search the actual default graph rather than the graph with that name.
    if (hasQuadPattern === DEFAULT_GRAPH || hasQuadPattern === DEFAULT_GRAPH_ALT)
      query.graph = '';
    else
      query.graph = hasQuadPattern;
  }

  // Indicate in the query whether the triple/quad pattern feature was used
  if (hasTriplePattern !== false)
    (query.features || (query.features = {})).triplePattern = true;
  if (hasQuadPattern !== false)
    (query.features || (query.features = {})).quadPattern = true;
};

// Expands a prefixed named into a full IRI
QuadPatternRouter.prototype._expandIRI = function (name) {
  var match = prefixedNameMatcher.exec(name), prefix;
  return match && (prefix = this._prefixes[match[1]]) ? prefix + match[2] : name;
};

module.exports = QuadPatternRouter;
