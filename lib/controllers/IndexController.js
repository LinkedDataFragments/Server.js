/*! @license ©2016 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** An IndexController responds to requests for indexes */

var TriplePatternFragmentsController = require('./TriplePatternFragmentsController');

// Creates a new IndexController
function IndexController(options) {
  if (!(this instanceof IndexController))
    return new IndexController(options);
  options = options || {};
  TriplePatternFragmentsController.call(this, options);
  this._indexes = options.indexes;
  this._routers = options.routers || [];
}
TriplePatternFragmentsController.extend(IndexController);

// Try to serve the requested fragment
IndexController.prototype._handleRequest = function (request, response, next) {
  // Create the query from the request by calling the fragment routers
  var requestParams = { url: request.parsedUrl },
      query = this._routers.reduce(function (query, router) {
    try { router.extractQueryParams(requestParams, query); }
    catch (e) { /* ignore routing errors */ }
    return query;
  }, { features: [] });

  // Execute the query on the data source
  var indexSettings = query.features.datasource && query.index && this._indexes[query.index];
  if (!indexSettings || !indexSettings.index.supportsQuery(query))
    return next();

  // Write the query result
  var view = this._negotiateView(query.rangeGate ? 'RangeGate' : 'TriplePatternFragments', request, response),
      settings = this._createFragmentMetadata(request, query, indexSettings);
  settings.resultStream = indexSettings.index.select(query,
                          function (error) { error && next(error); });

  view.render(settings, request, response);
};

// Create the template url for requesting TRG patterns
IndexController.prototype._createTemplateUrl = function(query, datasourceUrl) {
  if (query.rangeGate) {
    return datasourceUrl + '{?initial,final}';
  }
  return IndexController.prototype._createPatternString(query);
};

// Create parameterized pattern string for TRG patterns
IndexController.prototype._createPatternString = function(query) {
  if (query.rangeGate) {
    return '{ ' +
        (query.rangeGateBounds.initial ? '<' + query.rangeGateBounds.initial + '> ' : '?i ') +
        (query.rangeGateBounds.final ? '<' + query.rangeGateBounds.final + '> ' : '?f ') + ' }';
  }
  return TriplePatternFragmentsController.prototype._createPatternString(query);
};

module.exports = IndexController;
