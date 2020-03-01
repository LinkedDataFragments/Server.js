/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An empty data source doesn't contain any quads. */

var MemoryDatasource = require('./MemoryDatasource');

// Creates a new EmptyDatasource
class EmptyDatasource extends MemoryDatasource {
  constructor(options) {
    super(options);
  }
}
MemoryDatasource.extend(EmptyDatasource);

// Retrieves all quads in the datasource
EmptyDatasource.prototype._getAllQuads = function (addQuad, done) { done(); };

module.exports = EmptyDatasource;
