/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An IndexDatasource is a datasource that lists other data sources. */

var MemoryDatasource = require('./MemoryDatasource');

var rdf  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    dc   = 'http://purl.org/dc/terms/',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new IndexDatasource
function IndexDatasource(options) {
  if (!(this instanceof IndexDatasource))
    return new IndexDatasource(options);

  // Create triples for each data source
  var triples = [], datasources = options ? options.datasources : {};
  for (var name in datasources)  {
    var datasource = datasources[name], datasourceUrl = datasource.url + '#dataset';

    triple(datasourceUrl, rdf  + 'type', voID + 'Dataset');
    triple(datasourceUrl, rdfs + 'label', datasource.title, true);
    triple(datasourceUrl, dc   + 'title', datasource.title, true);
    triple(datasourceUrl, dc   + 'description', datasource.description, true);
  }
  this._setTriples(triples);

  // Adds a triple to the data source
  function triple(subject, predicate, object, isLiteral) {
    if (subject && predicate && object)
      triples.push({ subject: subject, predicate: predicate,
                     object: isLiteral ? '"' + object + '"' : object });
  }
}
MemoryDatasource.extend(IndexDatasource);

module.exports = IndexDatasource;
