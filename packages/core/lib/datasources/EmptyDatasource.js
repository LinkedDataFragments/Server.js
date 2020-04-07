/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An empty data source doesn't contain any quads. */

let MemoryDatasource = require('./MemoryDatasource');

// Creates a new EmptyDatasource
class EmptyDatasource extends MemoryDatasource {
  constructor(options) {
    super(options);
  }

  // Retrieves all quads in the datasource
  _getAllQuads(addQuad, done) { done(); }
}

module.exports = EmptyDatasource;
