/*! @license ©2014 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A QuadPatternRouter routes basic quad patterns */

var iriMatcher = /^(<?)([^_?$"<>][^"<>]*)>?$/;
var literalMatcher = /^("[^]*")(?:|\^\^<?([^"<>]+)>?|@[a-z0-9\-]+)$/i;
var prefixedNameMatcher = /^([a-z0-9\-]*):([^\/#:]*)$/i;

// Creates a new TriplePatternRouter
function QuadPatternRouter(config) {
  if (!(this instanceof QuadPatternRouter))
    return new QuadPatternRouter(config);
  this._prefixes = config && config.prefixes || {};
}

// Extracts triple pattern parameters from the request and add them to the query
QuadPatternRouter.prototype.extractQueryParams = function (request, query) {
  var queryString = request.url && request.url.query, match, hasQuadPattern = false;

  // Try to extract a subject IRI
  if (queryString.subject && (match = iriMatcher.exec(queryString.subject)))
    hasQuadPattern = query.subject = match[1] ? match[2] : this._expandIRI(match[2]);

  // Try to extract a predicate IRI
  if (queryString.predicate && (match = iriMatcher.exec(queryString.predicate)))
    hasQuadPattern = query.predicate = match[1] ? match[2] : this._expandIRI(match[2]);

  // Try to extract an object
  if (queryString.object) {
    // The object can be an IRI…
    if (match = iriMatcher.exec(queryString.object))
      hasQuadPattern = query.object = match[1] ? match[2] : this._expandIRI(match[2]);
    // or the object can be a literal (with a type or language)
    else if (match = literalMatcher.exec(queryString.object))
      hasQuadPattern = query.object = match[2] ? match[1] + '^^' + this._expandIRI(match[2]) : match[0];
  }

  // Try to extract a graph IRI
  if (queryString.graph && (match = iriMatcher.exec(queryString.graph)))
    hasQuadPattern = query.graph = match[1] ? match[2] : this._expandIRI(match[2]);

  // Indicate in the query whether the triple pattern feature was used
  if (hasQuadPattern !== false)
    (query.features || (query.features = {})).quadPattern = true;
};

// Expands a prefixed named into a full IRI
QuadPatternRouter.prototype._expandIRI = function (name) {
  var match = prefixedNameMatcher.exec(name), prefix;
  return match && (prefix = this._prefixes[match[1]]) ? prefix + match[2] : name;
};

module.exports = QuadPatternRouter;
