/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* HtmlView is a base class for views that generate RDF responses. */

var View = require('./View'),
    N3 = require('n3'),
    JsonLdSerializer = require('jsonld-streaming-serializer').JsonLdSerializer,
    RdfString = require('rdf-string'),
    _ = require('lodash');

var dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

var primaryTopic = 'http://xmlns.com/foaf/0.1/primaryTopic';

var contentTypes = 'application/trig;q=0.9,application/n-quads;q=0.7,' +
                   'application/ld+json;q=0.8,application/json;q=0.8,' +
                   'text/turtle;q=0.6,application/n-triples;q=0.5,text/n3;q=0.6';

// Creates a new RDF view with the given name and settings
function RdfView(viewName, settings) {
  if (!(this instanceof RdfView))
    return new RdfView(viewName, settings);
  View.call(this, viewName, contentTypes, settings);
}
View.extend(RdfView);

// Renders the view with the given settings to the response
RdfView.prototype._render = function (settings, request, response, done) {
  // Add generic writer settings
  settings.fragmentUrl = settings.fragment && settings.fragment.url || '';
  settings.metadataGraph = settings.fragmentUrl + '#metadata';
  settings.contentType = response.getHeader('Content-Type');

  // Write the triples with a content-type-specific writer
  var self = this,
      writer = /json/.test(settings.contentType) ? this._createJsonLdWriter(settings, response, done)
                                                 : this._createN3Writer(settings, response, done);
  settings.writer = writer;
  function main()   { self._generateRdf(settings, writer.data, writer.meta, after); }
  function after()  { self._renderViewExtensions('After',  settings, request, response, writer.end); }
  function before() { self._renderViewExtensions('Before', settings, request, response, main); }
  before();
};

// Generates triples and quads by sending them to the data and/or metadata callbacks
RdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  throw new Error('The _generateRdf method is not yet implemented.');
};

// Renders the specified view extension
RdfView.prototype._renderViewExtension = function (extension, options, request, response, done) {
  // only view extensions that generate triples are supported
  if (extension._generateRdf)
    extension._generateRdf(options, options.writer.data, options.writer.meta, done);
};

// Adds details about the datasources
RdfView.prototype._addDatasources = function (settings, data, metadata) {
  var datasources = settings.datasources;
  for (var datasourceName in datasources) {
    var datasource = datasources[datasourceName];
    metadata(datasource.url, rdf + 'type', voID  + 'Dataset');
    metadata(datasource.url, rdf + 'type', hydra + 'Collection');
    metadata(datasource.url, dcTerms + 'title', '"' + datasource.title + '"');
  }
};

// Creates a writer for Turtle/N-Triples/TriG/N-Quads
RdfView.prototype._createN3Writer = function (settings, response, done) {
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
        response.write(error ? '' : output);
        done();
      });
    },
  };
};

// Creates a writer for JSON-LD
RdfView.prototype._createJsonLdWriter = function (settings, response, done) {
  var prefixes = settings.prefixes || {};
  var metadataGraph = settings.metadataGraph;
  var context = _.clone(prefixes);
  delete context[''];
  var serializer = new JsonLdSerializer({ space: '  ', context: context, baseIRI: prefixes[''], useNativeTypes: true })
    .on('error', done);
  serializer.pipe(response);
  return {
    // Adds the data triple to the output
    data: function (s, p, o, g) {
      if (!p) g = s.graph, o = s.object, p = s.predicate, s = s.subject;
      if (!g) g = '';
      serializer.write(RdfString.stringQuadToQuad({ subject: s, predicate: p, object: o, graph: g }));
    },
    // Adds the metadata triple to the output
    meta: function (s, p, o) {
      if (s && p && o && !N3.Util.isLiteral(s))
        serializer.write(RdfString.stringQuadToQuad({ subject: s, predicate: p, object: o, graph: metadataGraph }));
    },
    // Ends the output and flushes the stream
    end: function () {
      serializer.end(done);
    },
  };
};

module.exports = RdfView;
