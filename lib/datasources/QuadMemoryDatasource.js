/*! @license ©2014 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A QuadMemoryDatasource queries a set of in-memory quads. */

var Datasource = require('./Datasource'),
    N3Store = require('n3').Store;

// Creates a new QuadMemoryDatasource
function QuadMemoryDatasource(options) {
  if (!(this instanceof QuadMemoryDatasource))
    return new QuadMemoryDatasource(options);
  Datasource.call(this, options);
  this._defaultGraph = options.defaultGraph || options.baseURL + '#defaultGraph';
}
Datasource.extend(QuadMemoryDatasource, ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount']);

// Prepares the datasource for querying
QuadMemoryDatasource.prototype._initialize = function (done) {
  var quadStore = this._quadStore = new N3Store();
  this._getAllQuads(function (s, p, o, g) { quadStore.addTriple(s, p, o, g); }, done);
};

// Retrieves all triples in the datasource
QuadMemoryDatasource.prototype._getAllQuads = function (addQuad, done) {
  throw new Error('_getAllQuads is not implemented');
};

// Writes the results of the query to the given triple stream
QuadMemoryDatasource.prototype._executeQuery = function (query, destination) {
  var offset =  query.offset || 0, limit = query.limit || Infinity,
      quads = this._quadStore.findByIRI(query.subject, query.predicate, query.object,
        query.graph === this._defaultGraph ? this._quadStore.defaultGraph : query.graph);
  // Send the metadata
  destination.setProperty('metadata', { totalCount: quads.length, hasExactCount: true });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, quads.length); i < l; i++) {
    if (quads[i].graph === '')
      quads[i].graph = this._defaultGraph;
    destination._push(quads[i]);
  }
  destination.close();
};

module.exports = QuadMemoryDatasource;
