/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A ForbiddenHtmlView represents a 401 response in HTML. */

import { HtmlView } from '../HtmlView';
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '../../types';

// Creates a new ForbiddenHtmlView
export class ForbiddenHtmlView extends HtmlView {
  constructor(settings?: ViewSettings) {
    super('Forbidden', settings);
  }

  // Renders the view with the given settings to the response
  protected override _render(settings: ViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    this._renderTemplate('forbidden/forbidden', settings, request, response, done);
  }
}

