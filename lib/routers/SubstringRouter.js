/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A SubstringRouter routes substring matches of literals */

var substringMatcher = /^\*(.+)\*$/;

// Creates a new SubstringRouter
function SubstringRouter(config) {
  if (!(this instanceof SubstringRouter))
    return new SubstringRouter(config);
  this._prefixes = config && config.prefixes || {};
}

// Extracts triple pattern parameters from the request and add them to the query
SubstringRouter.prototype.extractQueryParams = function (request, query) {
  var queryString = request.url && request.url.query, object = queryString && queryString.object,
      match = object && substringMatcher.exec(object);
  if (match) {
    query.substring = match[1];
    (query.features || (query.features = {})).substring = true;
  }
};

module.exports = SubstringRouter;
