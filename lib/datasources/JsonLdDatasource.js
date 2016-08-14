/*! @license MIT ©2014-2016 Ruben Verborgh - Ghent University / iMinds */
/* An JsonLdDatasource fetches data from a JSON-LD document. */

var MemoryDatasource = require('./MemoryDatasource'),
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

// Retrieves all triples from the document
JsonLdDatasource.prototype._getAllTriples = function (addTriple, done) {
  // Read the JSON-LD document
  var json = '',
      document = this._fetch({ url: this._url, headers: { accept: ACCEPT } });
  document.on('data', function (data) { json += data; });
  document.on('end', function () {
    // Parse the JSON document
    try { json = JSON.parse(json); }
    catch (error) { return done(error); }
    // Convert the JSON-LD to triples
    extractTriples(json, addTriple, done);
  });
};

// Extracts triples from a JSON-LD document
function extractTriples(json, addTriple, done) {
  jsonld.toRDF(json, function (error, triples) {
    for (var graphName in triples) {
      triples[graphName].forEach(function (triple) {
        addTriple(triple.subject.value,
                  triple.predicate.value,
                  convertEntity(triple.object));
      });
    }
    done(error);
  });
}

// Converts a jsonld.js entity to an N3.js IRI or literal
function convertEntity(entity) {
  // Return IRIs as-is
  if (entity.type === 'IRI')
    return entity.value;
  // Add a language tag to the literal if present
  if ('language' in entity)
    return '"' + entity.value + '"@' + entity.language;
  // Add a datatype to the literal if present
  if (entity.datatype !== 'http://www.w3.org/2001/XMLSchema#string')
    return '"' + entity.value + '"^^<' + entity.datatype + '>';
  // Otherwise, return the regular literal
  return '"' + entity.value + '"';
}

module.exports = JsonLdDatasource;
