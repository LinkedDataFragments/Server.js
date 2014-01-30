/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A JsonLdFragmentWriter represents a basic Linked Data Fragment as JSON-LD. */

var jsonld = require('jsonld'),
    N3Util = require('n3').Util,
    TurtleFragmentWriter = require('./TurtleFragmentWriter');

// Creates a new JsonLdFragmentWriter
function JsonLdFragmentWriter(datasetName, dataset, fragment, pattern, prefixes) {
  TurtleFragmentWriter.call(this, datasetName, dataset, fragment, pattern, prefixes);
}
JsonLdFragmentWriter.prototype = new TurtleFragmentWriter();

// Creates a JSON-LD writer that writes to the output stream
JsonLdFragmentWriter.prototype._createWriter = function (outputStream) {
  var triples = [], prefixes = this._prefixes;
  return {
    // Adds the given triple to the output
    addTriple: function (triple, predicate, object) {
      if (predicate && object)
        triple = { subject: triple, predicate: predicate, object: object };
      triples.push(triple);
    },
    // Adds the given triples to the output
    addTriples: function (newTriples) {
      triples.push.apply(triples, newTriples);
    },
    // Ends the output and flushes the stream
    end: function () {
      jsonld.fromRDF(triples, { format: true, useNativeTypes: true, rdfParser:
      // Converts the N3.js library triple representation to the JSON-LD library representation
      function fromN3Representation(triples) {
        return { '@default': triples.map(function (triple) {
          var subject = triple.subject, predicate = triple.predicate, object = triple.object;
          return {
            subject:   { value: triple.subject,   type: getTypeName(object) },
            predicate: { value: triple.predicate, type: getTypeName(object) },
            object:    !N3Util.isLiteral(object) ? { value: object, type: getTypeName(object) }
                                                 : { value: N3Util.getLiteralValue(object),
                                                     datatype: N3Util.getLiteralType(object),
                                                     language: N3Util.getLiteralLanguage(object) }
          };
        })};
      }},
      function (error, json) {
        jsonld.compact(error ? {} : json, prefixes, function (err, compacted) {
          outputStream.end(JSON.stringify(compacted, null, '  '));
        });
      });
    },
  };
};

// Gets the name of the given entity's type
function getTypeName(entity) {
  return N3Util.isUri(entity) ? 'IRI' : 'blank node';
}

module.exports = JsonLdFragmentWriter;
