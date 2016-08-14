/*! @license MIT ©2014-2016 Ruben Verborgh - Ghent University / iMinds */
/* A MemoryDatasource queries a set of in-memory triples. */

var Datasource = require('./Datasource'),
    N3Store = require('n3').Store;

// Creates a new MemoryDatasource
function MemoryDatasource(options) {
  if (!(this instanceof MemoryDatasource))
    return new MemoryDatasource(options);
  Datasource.call(this, options);
}
Datasource.extend(MemoryDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Prepares the datasource for querying
MemoryDatasource.prototype._initialize = function (done) {
  var tripleStore = this._tripleStore = new N3Store();
  this._getAllTriples(function (s, p, o, g) { tripleStore.addTriple(s, p, o, g); }, done);
};

// Retrieves all triples in the datasource
MemoryDatasource.prototype._getAllTriples = function (addTriple, done) {
  throw new Error('_getAllTriples is not implemented');
};

// Writes the results of the query to the given triple stream
MemoryDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity,
      triples = this._tripleStore.findByIRI(query.subject, query.predicate, query.object);
  // Send the metadata
  metadataCallback({ totalCount: triples.length, hasExactCount: true });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, triples.length); i < l; i++)
    tripleStream.push(triples[i]);
  tripleStream.push(null);
};

module.exports = MemoryDatasource;
