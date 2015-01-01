/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A JsonLdWriter represents Linked Data Fragments as JSON-LD. */

var jsonld = require('jsonld'),
    N3Util = require('n3').Util,
    _ = require('lodash'),
    TurtleWriter = require('./TurtleWriter');

var dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new JsonLdWriter
function JsonLdWriter() {
  if (!(this instanceof JsonLdWriter))
    return new JsonLdWriter();
}
JsonLdWriter.prototype = Object.create(TurtleWriter.prototype);

// Creates a writer that serializes triples to JSON-LD
JsonLdWriter.prototype._createWriter = function (destination, settings) {
  // Initialize triples, prefixes, and document base
  var data = [], metadata = [],
      metadataUrl = (settings.fragment && settings.fragment.pageUrl || '') + '#metadata',
      prefixes = settings.prefixes || {}, context = _.omit(prefixes, ''), base = prefixes[''];
  base && (context['@base'] = base);

  return {
    // Adds the data triple to the output
    data: function (s, p, o) {
      data.push(createTriple(s, p, o));
    },
    // Adds the metadata triple to the output
    meta: function (s, p, o) {
      if (s && p && o && !N3Util.isLiteral(s))
        metadata.push(createTriple(s, p, o));
    },
    // Ends the output and flushes the stream
    end: function () {
      var triples = { '@default': data };
      if (metadata.length) triples[metadataUrl] = metadata;
      jsonld.fromRDF(triples, { format: false, useNativeTypes: true },
      function (error, json) {
        jsonld.compact(error ? {} : json, context, function (err, compacted) {
          destination.end(JSON.stringify(compacted, null, '  '));
        });
      });
    },
  };
};

// Creates a triple in the JSON-LD library representation
function createTriple(subject, predicate, object) {
  return {
    subject:   { value: subject,   type: subject[0]   !== '_' ? 'IRI' : 'blank node' },
    predicate: { value: predicate, type: predicate[0] !== '_' ? 'IRI' : 'blank node' },
    object: !N3Util.isLiteral(object) ?
               { value: object,    type: object[0]    !== '_' ? 'IRI' : 'blank node' } :
               { value:    N3Util.getLiteralValue(object),
                 datatype: N3Util.getLiteralType(object),
                 language: N3Util.getLiteralLanguage(object) },
  };
}

module.exports = JsonLdWriter;
