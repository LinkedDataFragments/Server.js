/*! @license ©2014 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A QuadMemoryDatasource queries a set of in-memory quads. */

var Datasource = require('./Datasource'),
    N3Store = require('n3').Store;

// Creates a new QuadMemoryDatasource
function QuadMemoryDatasource(options) {
  if (!(this instanceof QuadMemoryDatasource))
    return new QuadMemoryDatasource(options);
  Datasource.call(this, options);

  this._defaultGraph = options.defaultGraph || options.baseURL + "#defaultGraph";
  var quadStore = this._quadStore = new N3Store({ defaultGraph: this._defaultGraph });
  setImmediate(function (self) {
    self._getAllQuads(function (s, p, o, g) { quadStore.addTriple(s, p, o, g); },
                        function (error) { if (error) throw error; });
  }, this);
}
Datasource.extend(QuadMemoryDatasource, ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount']);

// Retrieves all triples in the datasource
QuadMemoryDatasource.prototype._getAllQuads = function (addQuad, done) {
  throw new Error('_getAllQuads is not implemented');
};

// Writes the results of the query to the given triple stream
QuadMemoryDatasource.prototype._executeQuery = function (query, quadStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity,
      quads = this._quadStore.findByIRI(query.subject, query.predicate, query.object, query.graph);
  // Send the metadata
  metadataCallback({ totalCount: quads.length });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, quads.length); i < l; i++)
    quadStream.push(quads[i]);
  quadStream.push(null);
};

module.exports = QuadMemoryDatasource;
