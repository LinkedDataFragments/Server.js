/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* HtmlView is a base class for views that generate RDF responses. */

import { View } from './View';
import * as N3 from 'n3';
import { JsonLdSerializer } from 'jsonld-streaming-serializer';
import * as _ from 'lodash';
import type { DataFactory, Quad } from 'rdf-js';
import type { LdfRequest, LdfResponse, RdfViewSettings, RenderDone, ViewSettings } from '../types';

let dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

let primaryTopic = 'http://xmlns.com/foaf/0.1/primaryTopic';

let contentTypes = 'application/trig;q=0.9,application/n-quads;q=0.7,' +
                   'application/ld+json;q=0.8,application/json;q=0.8,' +
                   'text/turtle;q=0.6,application/n-triples;q=0.5,text/n3;q=0.6';

interface RdfWriter {
  data: (quad: Quad) => void;
  meta: (quad: Quad) => void;
  end: () => void;
}

// Duck-types a view extension that generates RDF, matching the original
// check's exact semantics (`extension._generateRdf`, not `instanceof RdfView`).
interface RdfViewExtension extends View {
  _generateRdf(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone): void;
}
function isRdfViewExtension(extension: View): extension is RdfViewExtension {
  return !!(extension as Partial<RdfViewExtension>)._generateRdf;
}

// Creates a new RDF view with the given name and settings
export class RdfView extends View {
  public override dataFactory: DataFactory;

  constructor(viewName: string, settings: RdfViewSettings) {
    super(viewName, contentTypes, settings);
    this.dataFactory = settings.dataFactory;
  }

  // Renders the view with the given settings to the response
  protected override _render(settings: ViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    // Add generic writer settings
    let fragmentUrl: string = settings.fragment && (settings.fragment as { url?: string }).url || '';
    settings.fragmentUrl = fragmentUrl;
    settings.metadataGraph = fragmentUrl + '#metadata';
    settings.contentType = response.getHeader('Content-Type') as string;

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
  protected _generateRdf(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone): void {
    throw new Error('The _generateRdf method is not yet implemented.');
  }

  // Renders the specified view extension
  protected override _renderViewExtension(extension: View, options: ViewSettings & { writer: RdfWriter }, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    // only view extensions that generate triples are supported
    if (isRdfViewExtension(extension))
      extension._generateRdf(options, options.writer.data, options.writer.meta, done);
  }

  // Adds details about the datasources
  protected _addDatasources(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void): void {
    let datasources = settings.datasources;
    for (let datasourceName in datasources) {
      let datasource = datasources[datasourceName];
      if (datasource.url) {
        const quad = this.dataFactory.quad, namedNode = this.dataFactory.namedNode, literal = this.dataFactory.literal;
        metadata(quad(namedNode(datasource.url), namedNode(rdf + 'type'), namedNode(voID  + 'Dataset')));
        metadata(quad(namedNode(datasource.url), namedNode(rdf + 'type'), namedNode(hydra + 'Collection')));
        metadata(quad(namedNode(datasource.url), namedNode(dcTerms + 'title'), literal('"' + (datasource.title as string) + '"', 'en')));
      }
    }
  }

  // Creates a writer for Turtle/N-Triples/TriG/N-Quads
  protected _createN3Writer(settings: ViewSettings, response: LdfResponse, done: RenderDone): RdfWriter {
    let writer = new N3.Writer({ format: settings.contentType, prefixes: settings.prefixes }),
        supportsGraphs = /trig|quad/.test(settings.contentType!), metadataGraph: string | undefined;

    const dataFactory = this.dataFactory;
    return {
      // Adds the data quad to the output
      // NOTE: The first parameter can also be a quad object
      data: function (quad: Quad) {
        writer.addQuad(quad);
      },
      // Adds the metadata triple to the output
      meta: function (quad: Quad) {
        // Relate the metadata graph to the data.
        if (supportsGraphs && !metadataGraph) {
          metadataGraph = settings.metadataGraph;
          writer.addQuad(dataFactory.namedNode(metadataGraph!), dataFactory.namedNode(primaryTopic), dataFactory.namedNode(settings.fragmentUrl), dataFactory.namedNode(metadataGraph!));
        }
        const graph = quad.graph.termType === 'DefaultGraph' ? (metadataGraph ? dataFactory.namedNode(metadataGraph) : dataFactory.defaultGraph()) : quad.graph;
        writer.addQuad(dataFactory.quad(quad.subject, quad.predicate, quad.object, graph));
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
  protected _createJsonLdWriter(settings: ViewSettings, response: LdfResponse, done: RenderDone): RdfWriter {
    let prefixes = settings.prefixes || {}, context: Record<string, any> = _.omit(prefixes, ''), base = prefixes[''];
    base && (context['@base'] = base);
    const mySerializer = new JsonLdSerializer({ space: '  ', context: context, baseIRI: prefixes[''], useNativeTypes: true })
      .on('error', done);
    mySerializer.pipe(response);
    mySerializer.on('error', (e: Error) => done(e));
    mySerializer.on('end', () => done(null));

    const dataFactory = this.dataFactory;
    return {
      // Adds the data triple to the output
      data: function (quad: Quad) {
        mySerializer.write(quad);
      },
      // Adds the metadata triple to the output
      meta: function (quad: Quad) {
        const graph = quad.graph.termType === 'DefaultGraph' ? (settings.metadataGraph  ? dataFactory.namedNode(settings.metadataGraph) : dataFactory.defaultGraph()) : quad.graph;
        mySerializer.write(dataFactory.quad(quad.subject, quad.predicate, quad.object, graph));
      },
      // Ends the output and flushes the stream
      end: function () {
        // We need to wait for the serializer stream to end before calling done()
        mySerializer.end();
      },
    };
  }
}

