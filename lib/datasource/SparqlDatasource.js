/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A SparqlDatasource provides queryable access to a SPARQL endpoint. */

var Datasource = require('./Datasource');

// Creates a new SparqlDatasource
function SparqlDatasource(endpointUrl) {
  if (!(this instanceof SparqlDatasource))
    return new SparqlDatasource(endpointUrl);
  Datasource.call(this);

  this._endpointUrl = endpointUrl || '';
}
Datasource.extend(SparqlDatasource, ['triplePattern', 'limit', 'offset']);

module.exports = SparqlDatasource;
