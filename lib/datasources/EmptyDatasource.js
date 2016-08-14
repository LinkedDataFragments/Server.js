/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
/* An empty data source doesn't contain any triples. */

var MemoryDatasource = require('./MemoryDatasource');

// Creates a new EmptyDatasource
function EmptyDatasource(options) {
  if (!(this instanceof EmptyDatasource))
    return new EmptyDatasource(options);
  MemoryDatasource.call(this, options);
}
MemoryDatasource.extend(EmptyDatasource);

// Retrieves all triples in the datasource
EmptyDatasource.prototype._getAllTriples = function (addTriple, done) { done(); };

module.exports = EmptyDatasource;
