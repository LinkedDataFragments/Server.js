/*! @license MIT ©2014-2015 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A MemoryDatasource queries a set of in-memory quads. */

var Datasource = require('./Datasource'),
    N3Store = require('n3').Store;

// Creates a new MemoryDatasource
function MemoryDatasource(options) {
  if (!(this instanceof MemoryDatasource))
    return new MemoryDatasource(options);
  Datasource.call(this, options);
}
Datasource.extend(MemoryDatasource, ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount']);

// Prepares the datasource for querying
MemoryDatasource.prototype._initialize = function (done) {
  var quadStore = this._quadStore = new N3Store();
  this._getAllQuads(function (s, p, o, g) { quadStore.addTriple(s, p, o, g); }, done);
};

// Retrieves all quads in the datasource
MemoryDatasource.prototype._getAllQuads = function (addQuad, done) {
  throw new Error('_getAllQuads is not implemented');
};

// Writes the results of the query to the given quad stream
MemoryDatasource.prototype._executeQuery = function (query, destination) {
  if (query.graph === '')
    query.graph = this._quadStore.defaultGraph;
  var offset = query.offset || 0, limit = query.limit || Infinity,
      quads = this._quadStore.findByIRI(query.subject, query.predicate, query.object,
                                        query.graph);
  // Send the metadata
  destination.setProperty('metadata', { totalCount: quads.length, hasExactCount: true });
  // Send the requested subset of quads
  for (var i = offset, l = Math.min(offset + limit, quads.length); i < l; i++)
    destination._push(quads[i]);
  destination.close();
};

module.exports = MemoryDatasource;
