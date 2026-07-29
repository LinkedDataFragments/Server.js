/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A SummaryRdfView represents a data summary in RDF. */

import RdfView = require('@ldf/core/lib/views/RdfView');
import type { Quad } from 'rdf-js';
import type { RenderDone, ViewSettings } from '@ldf/core/lib/types';

// Creates a new SummaryRdfView
class SummaryRdfView extends RdfView {
  constructor(settings?: ViewSettings) {
    super('Summary', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  protected override _generateRdf(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone): void {
    // Add summary triples
    settings.results.on('data', data);
    settings.results.on('end',  done);
  }
}

export = SummaryRdfView;
