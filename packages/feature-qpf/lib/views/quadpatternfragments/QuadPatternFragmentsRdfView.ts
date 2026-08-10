/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A QuadPatternFragmentsRdfView represents a Quad Pattern Fragment in RDF. */

import { RdfView } from '@ldf/core/lib/views/RdfView';
import { stringQuadToQuad } from 'rdf-string';
import type { IStringQuad } from 'rdf-string';
import type { AsyncIterator } from 'asynciterator';
import type { Quad } from 'rdf-js';
import type { Query, RdfViewSettings, RenderDone, ViewSettings } from '@ldf/core';
import type { Datasource } from '@ldf/core/lib/datasources/Datasource';

let dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    sd = 'http://www.w3.org/ns/sparql-service-description#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

interface FragmentInfo {
  url: string;
  pageUrl: string;
  firstPageUrl: string;
  nextPageUrl: string;
  previousPageUrl: string | null;
}

type DatasourceInfo = Datasource & { index: string; templateUrl: string; supportsQuads: boolean };

// Creates a new QuadPatternFragmentsRdfView
export class QuadPatternFragmentsRdfView extends RdfView {
  constructor(settings: RdfViewSettings) {
    super(settings.viewNameOverride || 'QuadPatternFragments', settings);
  }

  // Generates quads by sending them to the data and/or metadata callbacks
  protected override _generateRdf(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone): void {
    let datasource: DatasourceInfo = settings.datasource, fragment: FragmentInfo = settings.fragment, query: Query = settings.query,
        results: AsyncIterator<Quad> = settings.results, metadataDone = false;

    // Add data source metadata
    this._generateMetadata(metadata, fragment, query, datasource);

    // Add data source controls
    this._generateControls(metadata, fragment, query, datasource);

    // Add fragment metadata
    results.getProperty('metadata', (meta: { totalCount: number; hasExactCount: boolean }) => {
      this.sendFragmentMetadata(metadata, fragment, query, datasource, meta);

      // End if the data was also written
      metadataDone = true;
      results.ended && done();
    });

    // Add data quads
    results.on('data', data);
    results.on('end', () => { metadataDone && done(); });
  }

  // Generate the datasource metadata
  protected _generateMetadata(metadata: (quad: Quad) => void, fragment: FragmentInfo, query: Query, datasource: DatasourceInfo): void {
    if (!datasource.url) return;
    datasource.index && metadata(this.quad({ subject: datasource.index, predicate: hydra + 'member', object: datasource.url }));
    metadata(this.quad({ subject: datasource.url, predicate: rdf + 'type', object: voID  + 'Dataset' }));
    metadata(this.quad({ subject: datasource.url, predicate: rdf + 'type', object: hydra + 'Collection' }));
    fragment.pageUrl && metadata(this.quad({ subject: datasource.url, predicate: voID + 'subset', object: fragment.pageUrl }));
    if (fragment.url && fragment.pageUrl && fragment.url !== fragment.pageUrl)
      metadata(this.quad({ subject: datasource.url, predicate: voID + 'subset', object: fragment.url }));
  }

  // Generate the datasource controls
  protected _generateControls(metadata: (quad: Quad) => void, fragment: FragmentInfo, query: Query, datasource: DatasourceInfo): void {
    if (datasource.url && datasource.supportsQuads)
      metadata(this.quad({ subject: datasource.url, predicate: sd + 'defaultGraph', object: 'urn:ldf:defaultGraph' }));
    datasource.url && metadata(this.quad({ subject: datasource.url, predicate: hydra + 'search', object: '_:pattern' }));
    datasource.templateUrl && metadata(this.quad({ subject: '_:pattern', predicate: hydra + 'template', object: '"' + datasource.templateUrl + '"' }));
    metadata(this.quad({ subject: '_:pattern', predicate: hydra + 'variableRepresentation', object: hydra + 'ExplicitRepresentation' }));
    metadata(this.quad({ subject: '_:pattern', predicate: hydra + 'mapping', object: '_:subject' }));
    metadata(this.quad({ subject: '_:pattern', predicate: hydra + 'mapping', object: '_:predicate' }));
    metadata(this.quad({ subject: '_:pattern', predicate: hydra + 'mapping', object: '_:object' }));
    if (datasource.supportsQuads)
      metadata(this.quad({ subject: '_:pattern', predicate: hydra + 'mapping', object: '_:graph' }));
    metadata(this.quad({ subject: '_:subject', predicate: hydra + 'variable', object: '"subject"' }));
    metadata(this.quad({ subject: '_:subject', predicate: hydra + 'property', object: rdf + 'subject' }));
    metadata(this.quad({ subject: '_:predicate', predicate: hydra + 'variable', object: '"predicate"' }));
    metadata(this.quad({ subject: '_:predicate', predicate: hydra + 'property', object: rdf + 'predicate' }));
    metadata(this.quad({ subject: '_:object', predicate: hydra + 'variable', object: '"object"' }));
    metadata(this.quad({ subject: '_:object', predicate: hydra + 'property', object: rdf + 'object' }));
    if (datasource.supportsQuads) {
      metadata(this.quad({ subject: '_:graph', predicate: hydra + 'variable', object: '"graph"' }));
      metadata(this.quad({ subject: '_:graph', predicate: hydra + 'property', object: sd  + 'graph' }));
    }
  }

  // Generate the fragment metadata
  sendFragmentMetadata(metadata: (quad: Quad) => void, fragment: FragmentInfo, query: Query, datasource: DatasourceInfo, meta: { totalCount: number; hasExactCount: boolean }): void {
    if (!fragment.pageUrl) return;
    // General fragment metadata
    fragment.url && metadata(this.quad({ subject: fragment.url, predicate: voID + 'subset', object: fragment.pageUrl }));
    metadata(this.quad({ subject: fragment.pageUrl, predicate: rdf + 'type', object: hydra + 'PartialCollectionView' }));
    metadata(this.quad({ subject: fragment.pageUrl, predicate: dcTerms + 'title',
      object: '"Linked Data Fragment of ' + (datasource.title || '') + '"@en' }));
    metadata(this.quad({ subject: fragment.pageUrl, predicate: dcTerms + 'description',
      object: '"Triple/Quad Pattern Fragment of the \'' + (datasource.title || '') + '\' dataset ' +
      'containing triples matching the pattern ' + (query.patternString as string) + '."@en' }));
    datasource.url && metadata(this.quad({ subject: fragment.pageUrl, predicate: dcTerms + 'source', object: datasource.url }));

    // Total pattern matches count
    let totalCount = meta.totalCount;
    metadata(this.quad({ subject: fragment.pageUrl, predicate: hydra + 'totalItems', object: '"' + totalCount + '"^^' + xsd + 'integer' }));
    metadata(this.quad({ subject: fragment.pageUrl, predicate: voID  + 'triples', object: '"' + totalCount + '"^^' + xsd + 'integer' }));

    // Page metadata
    metadata(this.quad({ subject: fragment.pageUrl, predicate: hydra + 'itemsPerPage', object: '"' + String(query.limit) + '"^^' + xsd + 'integer' }));
    fragment.firstPageUrl && metadata(this.quad({ subject: fragment.pageUrl, predicate: hydra + 'first', object: fragment.firstPageUrl }));
    if (query.offset)
      fragment.previousPageUrl && metadata(this.quad({ subject: fragment.pageUrl, predicate: hydra + 'previous', object: fragment.previousPageUrl }));
    if (totalCount >= Number(query.limit) + (query.offset || 0))
      fragment.nextPageUrl && metadata(this.quad({ subject: fragment.pageUrl, predicate: hydra + 'next', object: fragment.nextPageUrl }));
  }

  quad(quadObject: IStringQuad): Quad {
    return stringQuadToQuad(quadObject, this.dataFactory);
  }
}

