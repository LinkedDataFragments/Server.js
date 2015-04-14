/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A CompositeDatasource combines multiple data sources. */

var Datasource = require('./Datasource'),
    _ = require('lodash');

// Creates a new CompositeDatasource
function CompositeDatasource(options) {
  if (!(this instanceof CompositeDatasource))
    return new CompositeDatasource(options);
  this._datasources = options && options.datasources || [];
}
Datasource.extend(CompositeDatasource);

// Checks whether the data source can evaluate the given query
CompositeDatasource.prototype.supportsQuery = function (query) {
  return _.some(this._datasources, supportsQuery, query);
};

// Selects the triples that match the given query, returning a triple stream
CompositeDatasource.prototype.select = function (query, onError) {
  var datasource = _.find(this._datasources, supportsQuery, query);
  if (datasource) return datasource.select(query, onError);
  onError && onError(new Error('The datasource does not support the given query'));
};

// Checks whether the given data source can evaluate a query
function supportsQuery(datasource) { return datasource.supportsQuery(this); }

module.exports = CompositeDatasource;
