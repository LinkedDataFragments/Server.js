/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A QuadPatternFragmentsRdfView represents a TPF or QPF in HTML. */

import { HtmlView } from '@ldf/core/lib/views/HtmlView';
import { join } from 'path';
import type { AsyncIterator } from 'asynciterator';
import type { Quad } from 'rdf-js';
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '@ldf/core';
import type { IndexDatasource } from '@ldf/core/lib/datasources/IndexDatasource';

interface QuadPatternFragmentsViewSettings extends ViewSettings {
  datasource: Partial<IndexDatasource>;
}

// Creates a new QuadPatternFragmentsHtmlView
export class QuadPatternFragmentsHtmlView extends HtmlView {
  viewDirectory: string;

  constructor(settings?: ViewSettings) {
    super('QuadPatternFragments', settings);

    this.viewDirectory = __dirname;
  }

  // Renders the view with the given settings to the response
  protected override _render(settings: QuadPatternFragmentsViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    // Read the data and metadata
    let self = this, quads: Quad[] = settings.quads = [], results: AsyncIterator<Quad> = settings.results;
    results.on('data', (triple) => { quads.push(triple); });
    results.on('end',  () => { settings.metadata && renderHtml(); });
    results.getProperty('metadata', (metadata: { totalCount: number; hasExactCount: boolean }) => {
      settings.metadata = metadata;
      results.ended && renderHtml();
    });

    // Generates the HTML after the data and metadata have been retrieved
    function renderHtml() {
      let template = settings.datasource.role === 'index' ? 'index' : 'datasource';
      settings.extensions = { Before: null, FormBefore: null, FormAfter: null, QuadBefore: 'function', QuadAfter: 'function', After: null };
      self._renderTemplate(join(self.viewDirectory, template), settings, request, response, done);
    }
  }
}

