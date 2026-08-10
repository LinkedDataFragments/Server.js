/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorRdfView represents a 500 response in RDF. */

import { RdfView } from '../RdfView';
import type { Quad } from 'rdf-js';
import type { RdfViewSettings, RenderDone, ViewSettings } from '../../types';

// Creates a new ErrorRdfView
export class ErrorRdfView extends RdfView {
  constructor(settings: RdfViewSettings) {
    super('Error', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  protected override _generateRdf(settings: ViewSettings, data: (quad: Quad) => void, metadata: (quad: Quad) => void, done: RenderDone): void {
    this._addDatasources(settings, data, metadata);
    done();
  }
}


