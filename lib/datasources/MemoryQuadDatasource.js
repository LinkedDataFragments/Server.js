/** A MemoryQuadDatasource queries a set of in-memory quads. */

var Datasource = require('./Datasource'),
    N3Store = require('n3').Store;

// Creates a new MemoryDatasource
function MemoryQuadDatasource(options) {
  if (!(this instanceof MemoryQuadDatasource))
    return new MemoryQuadDatasource(options);
  Datasource.call(this, options);

  this._setQuads(options && options.quads || []);
  this.isQuadsEnabled = true;
}
Datasource.extend(MemoryQuadDatasource, ['triplePattern', 'limit', 'offset', 'totalCount', 'quadPattern']);

MemoryQuadDatasource.prototype._blankNodeEnabledFields = Datasource.prototype._blankNodeEnabledFields.concat(['context']);
MemoryQuadDatasource.prototype._optionalFields = Datasource.prototype._blankNodeEnabledFields.concat(['context']);

// Sets the source triples that will be queried
MemoryQuadDatasource.prototype._setQuads = function (quads) {
  //this._quadStore = new QuadStore(quads);
  this._quadStore = new N3Store(quads);
};

// Writes the results of the query to the given triple stream
MemoryQuadDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity;
  var quads = this._quadStore.findByIRI(query.subject, query.predicate, query.object, query.graph);

  // Send the metadata
  metadataCallback({ totalCount: quads.length });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, quads.length); i < l; i++)
    tripleStream.push(quads[i]);
  tripleStream.push(null);
};

// Push a new element or an array inside the datasource.
MemoryQuadDatasource.prototype.push = function(element) {
  if(element instanceof Array) {
    var self = this;
    element.forEach(function(el) { self.push(el); });
  } else {
    this._quadStore.addTriple(element.subject, element.predicate, element.object, element.context);
  }
};

MemoryQuadDatasource.prototype.remove = function(element) {
  if(element instanceof Array) {
    var self = this;
    element.forEach(function(el) { self.remove(el); });
  } else {
    this._quadStore.removeTriple(element.subject, element.predicate, element.object, element.context);
  }
};

module.exports = MemoryQuadDatasource;
