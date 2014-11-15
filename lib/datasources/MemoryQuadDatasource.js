/** A MemoryQuadDatasource queries a set of in-memory quads. */

var Datasource = require('./Datasource');

// Creates a new MemoryDatasource
function MemoryQuadDatasource(options) {
  if (!(this instanceof MemoryQuadDatasource))
    return new MemoryQuadDatasource(options);
  Datasource.call(this, options);

  this._setQuads(options && options.quads || []);
  this.isQuadsEnabled = true;
}
Datasource.extend(MemoryQuadDatasource, ['triplePattern', 'limit', 'offset', 'totalCount', 'quadPattern']);

MemoryQuadDatasource.prototype._blankNodeEnabledFields = Datasource.prototype._blankNodeEnabledFields.concat(['graph']);
MemoryQuadDatasource.prototype._optionalFields = Datasource.prototype._blankNodeEnabledFields.concat(['graph']);

// Sets the source triples that will be queried
MemoryQuadDatasource.prototype._setQuads = function (quads) {
  this._quadStore = new QuadStore(quads);
};

// Writes the results of the query to the given triple stream
MemoryQuadDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity,
    quads = this._quadStore.findByUri(query.subject, query.predicate, query.object, query.graph);
  // Send the metadata
  metadataCallback({ totalCount: quads.length });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, quads.length); i < l; i++)
    tripleStream.push(quads[i]);
  tripleStream.push(null);
};

// Creates a new QuadStore
// TODO: This is only a very naive implementation and should be improved when used in production.
function QuadStore(quads) {
  if (!(this instanceof QuadStore))
    return new QuadStore(quads);
  this.quads = quads;
}

function isElementMatch(sourceElement, matchingElement) {
  return !matchingElement ||
    matchingElement.substr(0, 2) === '_:' ||
    matchingElement.substr(0, 1) === '?' ||
    matchingElement == sourceElement;
}

QuadStore.prototype.findByUri = function(subject, predicate, object, graph) {
  var quads = [];
  this.quads.forEach(function(quad) {
    if(isElementMatch(quad.subject, subject) &&
      isElementMatch(quad.predicate, predicate) &&
      isElementMatch(quad.object, object) &&
      ((!graph) || isElementMatch(quad.graph, graph))) {
        quads.push(quad);
      }
  });
  return quads;
};

module.exports = MemoryQuadDatasource;
