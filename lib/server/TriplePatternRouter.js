/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TriplePatternRouter routes basic triple patterns */

var iriMatcher = /^<?([^_?$"<>][^"<>]*)>?$/;
var literalMatcher = /^(".*")(?:|\^\^<?([^"<>]+)>?|@[a-z0-9\-]+)$/i;

// Creates a new TriplePatternRouter
function TriplePatternRouter() {
  if (!(this instanceof TriplePatternRouter))
    return new TriplePatternRouter();
}

// Extract parameters from the request and add them to the query
TriplePatternRouter.prototype.extractQueryParams = function (request, query) {
  var queryString = request.url && request.url.query, match;
  if (!queryString) return;

  // Try to extract a subject IRI
  if (queryString.subject && (match = iriMatcher.exec(queryString.subject)))
    query.subject = match[1];

  // Try to extract a predicate IRI
  if (queryString.predicate && (match = iriMatcher.exec(queryString.predicate)))
    query.predicate = match[1];

  // Try to extract an object
  if (queryString.object) {
    // The object can be an IRI…
    if (match = iriMatcher.exec(queryString.object))
      query.object = match[1];
    // or the object can be a literal (with a type or language)
    else if (match = literalMatcher.exec(queryString.object))
      query.object = match[2] ? match[1] + '^^' + match[2] : match[0];
  }
};

module.exports = TriplePatternRouter;
