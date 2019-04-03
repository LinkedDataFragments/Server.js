/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An JsonLdDatasource fetches data from a JSON-LD document. */

var MemoryDatasource = require('./MemoryDatasource'),
    JsonLdParser = require('jsonld-streaming-parser').JsonLdParser,
    RdfString = require('rdf-string');

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
  var document = this._fetch({ url: this._url, headers: { accept: ACCEPT } });
  new JsonLdParser({ baseIRI: this._url })
    .import(document)
    .on('error', done)
    .on('data', function (data) { addTriple(RdfString.quadToStringQuad(data)); })
    .on('end', done);
};

module.exports = JsonLdDatasource;
