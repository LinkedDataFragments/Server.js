/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* HtmlView is a base class for views that generate RDF responses. */

let View = require('./View'),
    N3 = require('n3'),
    JsonLdSerializer = require('jsonld-streaming-serializer').JsonLdSerializer,
    _ = require('lodash');

let dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

let primaryTopic = 'http://xmlns.com/foaf/0.1/primaryTopic';

let contentTypes = 'application/trig;q=0.9,application/n-quads;q=0.7,' +
                   'application/ld+json;q=0.8,application/json;q=0.8,' +
                   'text/turtle;q=0.6,application/n-triples;q=0.5,text/n3;q=0.6';

// Creates a new RDF view with the given name and settings
class RdfView extends View {
  constructor(viewName, settings) {
    super(viewName, contentTypes, settings);
  }

  // Renders the view with the given settings to the response
  _render(settings, request, response, done) {
    // Add generic writer settings
    settings.fragmentUrl = settings.fragment && settings.fragment.url || '';
    settings.metadataGraph = settings.fragmentUrl + '#metadata';
    settings.contentType = response.getHeader('Content-Type');

    // Write the triples with a content-type-specific writer
    let self = this,
        writer = /json/.test(settings.contentType) ? this._createJsonLdWriter(settings, response, done)
          : this._createN3Writer(settings, response, done);
    settings.writer = writer;
    function main()   { self._generateRdf(settings, writer.data, writer.meta, after); }
    function after()  { self._renderViewExtensions('After',  settings, request, response, writer.end); }
    function before() { self._renderViewExtensions('Before', settings, request, response, main); }
    before();
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  _generateRdf(settings, data, metadata, done) {
    throw new Error('The _generateRdf method is not yet implemented.');
  }

  // Renders the specified view extension
  _renderViewExtension(extension, options, request, response, done) {
    // only view extensions that generate triples are supported
    if (extension._generateRdf)
      extension._generateRdf(options, options.writer.data, options.writer.meta, done);
  }

  // Adds details about the datasources
  _addDatasources(settings, data, metadata) {
    let datasources = settings.datasources;
    for (let datasourceName in datasources) {
      let datasource = datasources[datasourceName];
      if (datasource.url) {
        const quad = this.dataFactory.quad, namedNode = this.dataFactory.namedNode, literal = this.dataFactory.literal;
        metadata(quad(namedNode(datasource.url), namedNode(rdf + 'type'), namedNode(voID  + 'Dataset')));
        metadata(quad(namedNode(datasource.url), namedNode(rdf + 'type'), namedNode(hydra + 'Collection')));
        metadata(quad(namedNode(datasource.url), namedNode(dcTerms + 'title'), literal('"' + datasource.title + '"', 'en')));
      }
    }
  }

  // Creates a writer for Turtle/N-Triples/TriG/N-Quads
  _createN3Writer(settings, response, done) {
    let writer = new N3.Writer({ format: settings.contentType, prefixes: settings.prefixes }),
        supportsGraphs = /trig|quad/.test(settings.contentType), metadataGraph;

    const dataFactory = this.dataFactory;
    return {
      // Adds the data quad to the output
      // NOTE: The first parameter can also be a quad object
      data: function (quad) {
        writer.addQuad(quad);
      },
      // Adds the metadata triple to the output
      meta: function (quad) {
        // Relate the metadata graph to the data.
        if (supportsGraphs && !metadataGraph) {
          metadataGraph = settings.metadataGraph;
          writer.addQuad(dataFactory.namedNode(metadataGraph), dataFactory.namedNode(primaryTopic), dataFactory.namedNode(settings.fragmentUrl), dataFactory.namedNode(metadataGraph));
        }
        quad.graph = quad.graph.termType === 'DefaultGraph' ? (metadataGraph ? dataFactory.namedNode(metadataGraph) : dataFactory.defaultGraph()) : quad.graph;
        writer.addQuad(quad);
      },
      // Ends the output and flushes the stream
      end: function () {
        writer.end((error, output) => {
          response.write(error ? '' : output);
          done();
        });
      },
    };
  }

  // Creates a writer for JSON-LD
  _createJsonLdWriter(settings, response, done) {
    let prefixes = settings.prefixes || {}, context = _.omit(prefixes, ''), base = prefixes[''];
    base && (context['@base'] = base);
    const mySerializer = new JsonLdSerializer({ space: '  ', context: context, baseIRI: prefixes[''], useNativeTypes: true })
      .on('error', done);
    mySerializer.pipe(response);
    mySerializer.on('error', (e => done(e)));
    mySerializer.on('end', (e => done(null)));

    const dataFactory = this.dataFactory;
    return {
      // Adds the data triple to the output
      data: function (quad) {
        mySerializer.write(quad);
      },
      // Adds the metadata triple to the output
      meta: function (quad) {
        quad.graph = quad.graph.termType === 'DefaultGraph' ? (settings.metadataGraph  ? dataFactory.namedNode(settings.metadataGraph) : dataFactory.defaultGraph()) : quad.graph;
        mySerializer.write(quad);
      },
      // Ends the output and flushes the stream
      end: function () {
        // We need to wait for the serializer stream to end before calling done()
        mySerializer.end();
      },
    };
  }
}

module.exports = RdfView;
