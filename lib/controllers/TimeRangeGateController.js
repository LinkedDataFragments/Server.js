/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A TimeRangeGateController responds to requests for time range gates */

var TriplePatternFragmentsController = require('./TriplePatternFragmentsController'),
    url = require('url'),
    _ = require('lodash'),
    Util = require('../Util');

// Creates a new QuadPatternFragmentsController
function TimeRangeGateController(options) {
  if (!(this instanceof TimeRangeGateController))
    return new TimeRangeGateController(options);
  options = options || {};
  TriplePatternFragmentsController.call(this, options);
  this._routers = options.routers || [];
}
TriplePatternFragmentsController.extend(TimeRangeGateController);

// The base name of the view to be used for this controller
TimeRangeGateController.prototype.viewName = 'TimeRangeGate';

// The required features the given datasource must have
TimeRangeGateController.prototype.supportsDatasource = function(datasource, query) {
  return datasource.getSupportedFeatures && datasource.getSupportedFeatures(query).timeRangeGate;
};

// Create the template url for requesting TRG patterns
TimeRangeGateController.prototype._createTemplateUrl = function(datasourceUrl) {
    return datasourceUrl + '{?initial,final}';
};

// Create parameterized pattern string for TRG patterns
TimeRangeGateController.prototype._createPatternString = function(query) {
    return '{ ' +
        (query.initial ? '<' + query.initial + '> ' : '?i ') +
        (query.final   ? '<' + query.final   + '> ' : '?f ') + ' }';
};

module.exports = TimeRangeGateController;
