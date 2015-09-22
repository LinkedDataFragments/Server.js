/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A TimeRangeGateRouter routes to TimeRange Gates of datasources. */

var matchTimeRangeGateRequest = /.*timeRangeGate\/?$/;
var matchTimeRangeRequest = /.*timeRange\/?$/;

// Creates a new TriplePatternRouter
function TimeRangeGateRouter(config) {
  if (!(this instanceof TimeRangeGateRouter))
    return new TimeRangeGateRouter(config);
  this._prefixes = config && config.prefixes || {};
}

// Extracts triple pattern parameters from the request and add them to the query
TimeRangeGateRouter.prototype.extractQueryParams = function (request, query) {
  if(query.features.datasource) {
    if(matchTimeRangeGateRequest.test(query.datasource)) {
      (query.features || (query.features = {})).timeRangeGate = true;
      query.datasource = query.datasource.replace("/timeRangeGate", "");
    } else if(matchTimeRangeRequest.test(query.datasource)) {
      (query.features || (query.features = {})).timeRange = true;
      query.datasource = query.datasource.replace("/timeRange", "");
      query.initial = request.url.query.initial;
      query.final = request.url.query.final;
    }
  }
};

module.exports = TimeRangeGateRouter;
