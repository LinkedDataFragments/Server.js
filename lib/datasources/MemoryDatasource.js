/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A MemoryDatasource queries a set of in-memory triples. */

var Datasource = require('./Datasource'),
    N3Store = require('n3').Store,
    Parser = require('n3').Parser,
    Util = require('../Util');

// Creates a new MemoryDatasource
function MemoryDatasource(options) {
  if (!(this instanceof MemoryDatasource))
    return new MemoryDatasource(options);
  Datasource.call(this, options);

  this._insert = options.insert;
  var tripleStore = this._tripleStore = new N3Store();
  setImmediate(function (self) {
    self._getAllTriples(function (s, p, o, g) { tripleStore.addTriple(s, p, o, g); },
                        function (error) { if (error) throw error; });
  }, this);
}
Datasource.extend(MemoryDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Retrieves all triples in the datasource
MemoryDatasource.prototype._getAllTriples = function (addTriple, done) {
  throw new Error('_getAllTriples is not implemented');
};

// Writes the results of the query to the given triple stream
MemoryDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity,
      triples = this._tripleStore.findByIRI(query.subject, query.predicate, query.object);
  // Send the metadata
  metadataCallback({ totalCount: triples.length });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, triples.length); i < l; i++)
    tripleStream.push(triples[i]);
  tripleStream.push(null);
};

// Checks whether the data source supports live insertion.
MemoryDatasource.prototype.supportsInsert = function (query) {
  return this._insert;
};

// Adds the given triplestream to the datasource
MemoryDatasource.prototype.insert = function (request, callback) {
  var parser = new Parser(),
      self = this,
      amount = 0;
  request.on('data', function (chunk) {
    parser.addChunk(chunk);
  });
  request.on('end', function () {
    parser.end();
  });
  parser.parse(function (error, triple, prefixes) {
    triple ? self._tripleStore.addTriple(triple) && amount++ : callback(error, amount);
  });
};

module.exports = MemoryDatasource;
