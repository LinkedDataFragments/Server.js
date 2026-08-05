/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */
/* A MementoControllerExtension extends Triple Pattern Fragments responses with Memento headers. */

import { Controller } from '@ldf/core/lib/controllers/Controller';
import { TimegateController } from './TimegateController';
import type { InvertedTimegateEntry, TimegateControllerOptions, MementoRequestSettings } from './TimegateController';
import * as url from 'url';
import type { LdfRequest, LdfResponse, ViewSettings } from '@ldf/core';

type MementoViewSettings = ViewSettings & MementoRequestSettings;

// Creates a new MementoControllerExtension
export class MementoControllerExtension extends Controller {
  protected _invertedTimegateMap: Record<string, InvertedTimegateEntry>;
  protected _timegateBaseUrl: string;

  constructor(settings?: TimegateControllerOptions) {
    super(settings);
    let timegates = settings!.timegates || {};
    this._invertedTimegateMap = TimegateController.parseInvertedTimegateMap(timegates.mementos, settings!.urlData!);
    this._timegateBaseUrl = timegates.baseURL || '/timegate/';
  }

  // Add Memento Link headers
  protected override _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void, settings?: MementoViewSettings): void {
    let datasource = settings!.query.datasource,
        memento = this._invertedTimegateMap[settings!.datasource.id as string],
        requestQuery = request.url!.match(/\?.*|$/)![0];

    // Add link to original if it is a memento
    if (memento && memento.interval && memento.interval.length === 2) {
      let timegatePath = this._timegateBaseUrl + memento.memento,
          timegateUrl = url.format({ ...request.parsedUrl, pathname: timegatePath }),
          originalUrl = memento.original + requestQuery,
          datetime = new Date(memento.interval[0]).toUTCString();

      response.setHeader('Link', '<' + originalUrl + '>;rel=original, <' + timegateUrl + '>;rel=timegate');
      response.setHeader('Memento-Datetime', datetime);
    }
    // Add timegate link if resource is not a memento
    else {
      let timegateSettings = settings!.datasource.timegate, timegate;
      // If a timegate URL is given, use it
      if (typeof timegateSettings === 'string')
        timegate = timegateSettings + requestQuery;
      // If the timegate configuration is true, use local timegate
      else if (timegateSettings === true)
        timegate = url.format({ ...request.parsedUrl, pathname: this._timegateBaseUrl + (datasource as string) });
      if (timegate)
        response.setHeader('Link', '<' + timegate + '>;rel=timegate');
    }
    next();
  }
}

