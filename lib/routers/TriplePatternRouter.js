/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TriplePatternRouter routes basic triple patterns */

var iriMatcher = /^(<?)([^_?$"<>][^"<>]*)>?$/;
var literalMatcher = /^(".*")(?:|\^\^<?([^"<>]+)>?|@[a-z0-9\-]+)$/i;
var prefixedNameMatcher = /^([a-z0-9\-]*):([^\/#:]*)$/i;

// Creates a new TriplePatternRouter
function TriplePatternRouter(config) {
  if (!(this instanceof TriplePatternRouter))
    return new TriplePatternRouter(config);
  this._prefixes = config && config.prefixes || {};
}

// Makes TriplePatternRouter the prototype of the given class
TriplePatternRouter.extend = function extend(child) {
  child.prototype = new this();
  child.extend = extend;
};

TriplePatternRouter.prototype._pureIRIFields = ['subject', 'predicate'];

// Extracts triple pattern parameters from the request and add them to the query
TriplePatternRouter.prototype.extractQueryParams = function (request, query) {
  var queryString = request.url && request.url.query, match, hasTriplePattern = false;

  var self = this;
  this._pureIRIFields.forEach(function(field) {
    // Try to extract the field IRI
    if (queryString[field] && (match = iriMatcher.exec(queryString[field])))
      hasTriplePattern = query[field] = match[1] ? match[2] : expandIRI(self._prefixes, match[2]);
  });

  // Try to extract an object
  if (queryString.object) {
    // The object can be an IRI…
    if (match = iriMatcher.exec(queryString.object))
      hasTriplePattern = query.object = match[1] ? match[2] : expandIRI(this._prefixes, match[2]);
    // or the object can be a literal (with a type or language)
    else if (match = literalMatcher.exec(queryString.object))
      hasTriplePattern = query.object = match[2] ? match[1] + '^^' + match[2] : match[0];
  }

  // Indicate in the query whether the triple pattern feature was used
  if (hasTriplePattern !== false)
    (query.features || (query.features = {})).triplePattern = true;
};

// Expands a prefixed named into a full IRI
function expandIRI(prefixes, name) {
  var match = prefixedNameMatcher.exec(name), prefix;
  return match && (prefix = prefixes[match[1]]) ? prefix + match[2] : name;
}

module.exports = TriplePatternRouter;
