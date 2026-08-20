/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorRdfView represents a 500 response in HTML. */

import { HtmlView } from '../HtmlView';
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '../../types';

// Creates a new ErrorHtmlView
export class ErrorHtmlView extends HtmlView {
  constructor(settings?: ViewSettings) {
    super('Error', settings);
  }

  // Renders the view with the given settings to the response
  protected override _render(settings: ViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    this._renderTemplate('error/error', settings, request, response, done);
  }
}

