/*! @license MIT ©2014-2016 Ruben Verborgh - Ghent University / iMinds */
/* An IndexDatasource is a datasource that lists other data sources. */

var MemoryDatasource = require('./MemoryDatasource');

var rdf  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    dc   = 'http://purl.org/dc/terms/',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new IndexDatasource
function IndexDatasource(options) {
  if (!(this instanceof IndexDatasource))
    return new IndexDatasource(options);
  MemoryDatasource.call(this, options);
  this._datasources = options ? options.datasources : {};
}
MemoryDatasource.extend(IndexDatasource);

// Creates triples for each data source
IndexDatasource.prototype._getAllTriples = function (addTriple, done) {
  for (var name in this._datasources)  {
    var datasource = this._datasources[name], datasourceUrl = datasource.url;
    if (!datasource.hide) {
      triple(datasourceUrl, rdf + 'type', voID + 'Dataset');
      triple(datasourceUrl, rdfs + 'label', datasource.title, true);
      triple(datasourceUrl, dc + 'title', datasource.title, true);
      triple(datasourceUrl, dc + 'description', datasource.description, true);
    }
  }
  function triple(subject, predicate, object, isLiteral) {
    if (subject && predicate && object)
      addTriple(subject, predicate, isLiteral ? '"' + object + '"' : object);
  }
  delete this._datasources;
  done();
};

module.exports = IndexDatasource;
