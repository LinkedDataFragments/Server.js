/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** HtmlView is a base class for views that generate RDF responses. */

var View = require('./View'),
    N3 = require('n3'),
    jsonld = require('jsonld'),
    _ = require('lodash');

var primaryTopic = 'http://xmlns.com/foaf/0.1/primaryTopic';

var contentTypes = 'application/trig;q=0.9,application/n-quads;q=0.7,' +
                   'application/ld+json;q=0.8,application/json;q=0.8,' +
                   'text/turtle;q=0.6,text/n-triples;q=0.5,text/n3;q=0.6';

// Creates a new RDF view with the given name and settings
function RdfView(viewName, settings) {
  if (!(this instanceof RdfView))
    return new RdfView(viewName, settings);
  View.call(this, viewName, contentTypes, settings);
}
View.extend(RdfView);

// Renders the view with the given settings to the response
RdfView.prototype._render = function (settings, request, response) {
  // Add generic writer settings
  settings.fragmentUrl = settings.fragment && settings.fragment.url || '';
  settings.metadataGraph = settings.fragmentUrl + '#metadata';
  settings.contentType = response.getHeader('Content-Type');

  // Write the triples with a content-type-specific writer
  var writer = /json/.test(settings.contentType) ? this._createJsonLdWriter(settings, response)
                                                 : this._createN3Writer(settings, response);
  this._generateRdf(settings, writer.data, writer.meta, writer.end);
};

// Generates triples and quads by sending them to the data and/or metadata callbacks
RdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  throw new Error('The _generateRdf method is not yet implemented.');
};

// Creates a writer for Turtle/N-Triples/TriG/N-Quads
RdfView.prototype._createN3Writer = function (settings, response) {
  var writer = new N3.Writer({ format: settings.contentType, prefixes: settings.prefixes }),
      supportsGraphs = /trig|quad/.test(settings.contentType), metadataGraph;
  return {
    // Adds the data triple to the output
    data: function (s, p, o, g) {
      writer.addTriple(s, p, o, supportsGraphs ? g : null);
    },
    // Adds the metadata triple to the output
    meta: function (s, p, o) {
      // Relate the metadata graph to the data
      if (supportsGraphs && !metadataGraph) {
        metadataGraph = settings.metadataGraph;
        writer.addTriple(metadataGraph, primaryTopic, settings.fragmentUrl, metadataGraph);
      }
      // Write the triple
      if (s && p && o && !N3.Util.isLiteral(s))
        writer.addTriple(s, p, o, metadataGraph);
    },
    // Ends the output and flushes the stream
    end: function () {
      writer.end(function (error, output) {
        response.end(error ? '' : output);
      });
    },
  };
};

// Creates a writer for JSON-LD
RdfView.prototype._createJsonLdWriter = function (settings, response) {
  // Initialize triples, prefixes, and document base
  var quads = { '@default': [] }, metadata = quads[settings.metadataGraph] = [],
      prefixes = settings.prefixes || {}, context = _.omit(prefixes, ''), base = prefixes[''];
  base && (context['@base'] = base);
  return {
    // Adds the data triple to the output
    data: function (s, p, o, g) {
      if (!p) g = s.graph, o = s.object, p = s.predicate, s = s.subject;
      if (!g) g = '@default';
      var graph = quads[g] || (quads[g] = []);
      graph.push(toJsonLdTriple(s, p, o));
    },
    // Adds the metadata triple to the output
    meta: function (s, p, o) {
      if (s && p && o && !N3.Util.isLiteral(s)) {
        metadata.push(toJsonLdTriple(s, p, o));
      }
    },
    // Ends the output and flushes the stream
    end: function () {
      jsonld.fromRDF(quads, { format: false, useNativeTypes: true },
      function (error, json) {
        jsonld.compact(error ? {} : json, context, function (err, compacted) {
          response.end(JSON.stringify(compacted, null, '  ') + '\n');
        });
      });
    },
  };
};

// Converts a triple to the JSON-LD library representation
function toJsonLdTriple(subject, predicate, object) {
  return {
    subject:   { value: subject,   type: subject[0]   !== '_' ? 'IRI' : 'blank node' },
    predicate: { value: predicate, type: predicate[0] !== '_' ? 'IRI' : 'blank node' },
    object: !N3.Util.isLiteral(object) ?
               { value: object,    type: object[0]    !== '_' ? 'IRI' : 'blank node' } :
               { value:    N3.Util.getLiteralValue(object),
                 datatype: N3.Util.getLiteralType(object),
                 language: N3.Util.getLiteralLanguage(object) },
  };
}

module.exports = RdfView;
