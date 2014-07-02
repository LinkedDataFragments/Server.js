/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A JsonLdFragmentWriter represents Triple Pattern Fragments as JSON-LD. */

var jsonld = require('jsonld'),
    N3Util = require('n3').Util,
    _ = require('lodash'),
    TurtleFragmentWriter = require('./TurtleFragmentWriter');

// Creates a new JsonLdFragmentWriter
function JsonLdFragmentWriter() {
  TurtleFragmentWriter.apply(this, arguments);
}
JsonLdFragmentWriter.prototype = new TurtleFragmentWriter();

// Creates a JSON-LD writer that writes to the output stream
JsonLdFragmentWriter.prototype._createWriter = function (outputStream) {
  // Initialize triples, prefixes, and document base
  var triples = [], context = _.omit(this._prefixes, ''), base = this._prefixes[''];
  base && (context['@base'] = base);

  return {
    // Adds the given triple to the output
    addTriple: function (triple, predicate, object) {
      if (predicate && object)
        triple = { subject: triple, predicate: predicate, object: object };
      triples.push(triple);
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
        jsonld.compact(error ? {} : json, context, function (err, compacted) {
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
