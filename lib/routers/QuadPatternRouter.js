/** A QuadPatternRouter routes basic quad patterns */

var TriplePatternRouter = require('./TriplePatternRouter');

// Creates a new QuadPatternRouter
function QuadPatternRouter(config) {
  if (!(this instanceof QuadPatternRouter))
    return new QuadPatternRouter(config);
  TriplePatternRouter.call(this, config);
}
TriplePatternRouter.extend(QuadPatternRouter);

QuadPatternRouter.prototype._pureIRIFields = TriplePatternRouter.prototype._pureIRIFields.concat(['context']);

// Extracts triple pattern parameters from the request and add them to the query
QuadPatternRouter.prototype.extractQueryParams = function (request, query) {
  TriplePatternRouter.prototype.extractQueryParams.apply(this, [request, query]);
  query.features.quadPattern = query.context && query.features.triplePattern;
};

module.exports = QuadPatternRouter;