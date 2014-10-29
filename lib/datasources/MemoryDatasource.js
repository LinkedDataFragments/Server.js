/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A MemoryDatasource queries a set of in-memory triples. */

var Datasource = require('./Datasource'),
    N3Store = require('n3').Store;

// Creates a new MemoryDatasource
function MemoryDatasource(options) {
  if (!(this instanceof MemoryDatasource))
    return new MemoryDatasource(options);
  Datasource.call(this, options);

  this._setTriples(options && options.triples || []);
}
Datasource.extend(MemoryDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Sets the source triples that will be queried
MemoryDatasource.prototype._setTriples = function (triples) {
  this._tripleStore = new N3Store(triples);
};

// Writes the results of the query to the given triple stream
MemoryDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity,
      triples = this._tripleStore.findByUri(query.subject, query.predicate, query.object);
  // Send the metadata
  metadataCallback({ totalCount: triples.length });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, triples.length); i < l; i++)
    tripleStream.push(triples[i]);
  tripleStream.push(null);
};

module.exports = MemoryDatasource;
