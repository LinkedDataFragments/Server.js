/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A QuadPatternFragmentsController responds to requests for fragments */

var TriplePatternFragmentsController = require('./TriplePatternFragmentsController'),
    url = require('url'),
    _ = require('lodash'),
    N3Util = require('n3').Util,
    Util = require('../Util');

// Creates a new QuadPatternFragmentsController
function QuadPatternFragmentsController(options) {
  if (!(this instanceof QuadPatternFragmentsController))
    return new QuadPatternFragmentsController(options);
  options = options || {};
  TriplePatternFragmentsController.call(this, options);
  this._routers = options.routers || [];
}
TriplePatternFragmentsController.extend(QuadPatternFragmentsController);

// The base name of the view to be used for this controller
QuadPatternFragmentsController.prototype.viewName = 'QuadPatternFragments';

// Create the template url for requesting quad patterns
QuadPatternFragmentsController.prototype._createTemplateUrl = function(datasourceUrl) {
    return datasourceUrl + '{?subject,predicate,object,graph}';
};

// Create parameterized pattern string for quad patterns
QuadPatternFragmentsController.prototype._createPatternString = function(query) {
    return '{ ' +
        (query.subject              ? '<' + query.subject   + '> ' : '?s ') +
        (query.predicate            ? '<' + query.predicate + '> ' : '?p ') +
        (N3Util.isIRI(query.object) ? '<' + query.object    + '> ' : (query.object || '?o ')) +
        (query.graph                ? '<' + query.graph     + '> ' : '?g' ) + ' }';
};

module.exports = QuadPatternFragmentsController;
