/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An JsonLdDatasource fetches triples from a JSON-LD document */

var Datasource = require('./Datasource'),
    jsonld = require('jsonld');

var accept = 'application/ld+json;q=1.0,application/json;q=0.7';

// Creates a new JsonLdDatasource for the given endpoint
function JsonLdDatasource(url) {
  this._url = url;
}

JsonLdDatasource.prototype = {
  // Gets all the triples in the document
  _getAllTriples: function (addTriple, done) {
    // Read the JSON-LD document
    var json = '', document = this.request({ url: this._url, headers: { accept: accept }}, done);
    document.on('data', function (data) { json += data; });
    document.on('end', function () {
      // Parse the JSON document
      try { json = JSON.parse(json); }
      catch (error) { return done(error); }
      // Convert the JSON to triples
      jsonld.toRDF(json, function (error, triples) {
        for (var graphName in triples)
          triples[graphName].forEach(add);
        done(error);
      });
    });
    // Add the jsonld.js triple as an N3.js triple
    function add(triple) {
      addTriple({ subject: triple.subject.value,
                  predicate: triple.predicate.value,
                  object: convertNode(triple.object) });
    }
  },
};
Datasource.extend(JsonLdDatasource);

// Converts a jsonld.js node to an N3.js IRI or literal
function convertNode(node) {
  // Return IRIs as-is
  if (node.type === 'IRI')
    return node.value;
  // Add a language tag to the literal if present
  if ('language' in node)
    return '"' + node.value + '"@' + node.language;
  // Add a datatype to the literal if present
  if (node.datatype !== 'http://www.w3.org/2001/XMLSchema#string')
    return '"' + node.value + '"^^<' + node.datatype + '>';
  // Otherwise, return the regular literal
  return '"' + node.value + '"';
}

module.exports = JsonLdDatasource;
