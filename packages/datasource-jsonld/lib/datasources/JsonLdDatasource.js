/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An JsonLdDatasource fetches data from a JSON-LD document. */

var MemoryDatasource = require('@ldf/core').datasources.MemoryDatasource,
    jsonld = require('jsonld');

var ACCEPT = 'application/ld+json;q=1.0,application/json;q=0.7';

// Creates a new JsonLdDatasource
function JsonLdDatasource(options) {
  if (!(this instanceof JsonLdDatasource))
    return new JsonLdDatasource(options);
  MemoryDatasource.call(this, options);
  this._url = options && (options.url || options.file);
}
MemoryDatasource.extend(JsonLdDatasource);

// Retrieves all quads from the document
JsonLdDatasource.prototype._getAllQuads = function (addQuad, done) {
  // Read the JSON-LD document
  var json = '',
      document = this._fetch({ url: this._url, headers: { accept: ACCEPT } });
  document.on('data', function (data) { json += data; });
  document.on('end', function () {
    // Parse the JSON document
    try { json = JSON.parse(json); }
    catch (error) { return done(error); }
    // Convert the JSON-LD to quads
    extractQuads(json, addQuad, done);
  });
};

// Extracts quads from a JSON-LD document
function extractQuads(json, addQuad, done) {
  jsonld.toRDF(json, function (error, graphs) {
    var graphNames = Object.keys(graphs);
    for (var i = 0; i < graphNames.length; i++) {
      var graphName = graphNames[i],
          graph = graphs[graphName],
          graphIRI = graphName === '@default' ? '' : graphName;
      for (var j = 0; j < graph.length; j++) {
        var triple = graph[j];
        addQuad(triple.subject.value, triple.predicate.value,
                convertEntity(triple.object), graphIRI);
      }
    }
    done(error);
  });
}

// Converts a jsonld.js entity to the N3.js in-memory representation
function convertEntity(entity) {
  // Return IRIs and blank nodes as-is
  if (entity.type !== 'literal')
    return entity.value;
  else {
    // Add a language tag to the literal if present
    if ('language' in entity)
      return '"' + entity.value + '"@' + entity.language;
    // Add a datatype to the literal if present
    if (entity.datatype !== 'http://www.w3.org/2001/XMLSchema#string')
      return '"' + entity.value + '"^^' + entity.datatype;
    // Otherwise, return the regular literal
    return '"' + entity.value + '"';
  }
}

module.exports = JsonLdDatasource;
