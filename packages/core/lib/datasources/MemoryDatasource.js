/*! @license MIT ©2014-2015 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A MemoryDatasource queries a set of in-memory quads. */

var Datasource = require('./Datasource'),
    N3Store = require('n3').Store;

// Creates a new MemoryDatasource
class MemoryDatasource extends Datasource {
  constructor(options) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);
  }

  // Prepares the datasource for querying
  _initialize(done) {
    var quadStore = this._quadStore = new N3Store();
    this._getAllQuads(function (quad) { quadStore.addQuad(quad); }, done);
  }

  // Retrieves all quads in the datasource
  _getAllQuads(addQuad, done) {
    throw new Error('_getAllQuads is not implemented');
  }

  // Writes the results of the query to the given quad stream
  _executeQuery(query, destination) {
    var offset = query.offset || 0, limit = query.limit || Infinity,
        quads = this._quadStore.getQuads(query.subject, query.predicate, query.object, query.graph);
    // Send the metadata
    destination.setProperty('metadata', { totalCount: quads.length, hasExactCount: true });
    // Send the requested subset of quads
    for (var i = offset, l = Math.min(offset + limit, quads.length); i < l; i++)
      destination._push(quads[i]);
    destination.close();
  }
}

module.exports = MemoryDatasource;
