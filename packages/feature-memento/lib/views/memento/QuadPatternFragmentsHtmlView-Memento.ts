/*! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
/* A MementoHtmlViewExtension extends the Quad Pattern Fragments HTML view with Memento details. */

import { HtmlView } from '@ldf/core/lib/views/HtmlView';
import { TimegateController } from '../../controllers/TimegateController';
import type { InvertedTimegateEntry, TimegateControllerOptions, MementoRequestSettings } from '../../controllers/TimegateController';
import * as path from 'path';
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '@ldf/core';

type MementoViewSettings = ViewSettings & Pick<MementoRequestSettings, 'datasource'>;

// Creates a new MementoHtmlViewExtension
export class MementoHtmlViewExtension extends HtmlView {
  protected _invertedTimegateMap: Record<string, InvertedTimegateEntry>;

  constructor(settings?: TimegateControllerOptions & ViewSettings) {
    super('QuadPatternFragments:Before', settings);
    let timegates = settings!.timegates || {};
    this._invertedTimegateMap = TimegateController.parseInvertedTimegateMap(timegates.mementos, settings!.urlData!);
  }

  // Renders the view with the given settings to the response
  protected override _render(settings: MementoViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    let memento = this._invertedTimegateMap[settings.datasource.id as string];
    if (!memento)
      return done();
    this._renderTemplate(path.join(__dirname, 'memento-details'), {
      start: memento.interval[0],
      end:   memento.interval[1],
    }, request, response, done);
  }
}

