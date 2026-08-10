/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A SummaryRdfView represents a data summary in RDF. */

import { RdfView } from '@ldf/core/lib/views/RdfView';
import type { StreamParser } from 'n3';
import type { Quad } from 'rdf-js';
import type { RdfViewSettings, RenderDone, ViewSettings } from '@ldf/core';

// Creates a new SummaryRdfView
export class SummaryRdfView extends RdfView {
  public constructor(settings: RdfViewSettings) {
    super('Summary', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  protected override _generateRdf(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone): void {
    // Add summary triples
    const results: StreamParser = settings.results;
    results.on('data', data);
    results.on('end',  done);
  }
}

