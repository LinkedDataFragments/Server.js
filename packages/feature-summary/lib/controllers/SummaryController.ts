/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* An SummaryController responds to requests for summaries */

import { Controller } from '@ldf/core/lib/controllers/Controller';
import * as fs from 'fs';
import * as path from 'path';
import { StreamParser } from 'n3';
import * as Util from '@ldf/core/lib/Util';
import type { ControllerOptions, LdfRequest, LdfResponse, Query } from '@ldf/core';
import type { Datasource } from '@ldf/core/lib/datasources/Datasource';

export interface SummariesConfig {
  dir?: string;
  path?: string;
}

// The view-settings fields the summary view extensions read off the
// request's context; the HTML view doesn't need `datasource`.
export interface SummaryRenderSettings {
  summaries?: SummariesConfig;
  datasource: Datasource;
  query: Query;
  baseURL?: string;
}

interface SummaryControllerOptions extends ControllerOptions {
  summaries?: SummariesConfig;
}

// Creates a new SummaryController
export class SummaryController extends Controller {
  protected _enabled?: string;
  protected _summariesFolder: string;
  protected _summariesPath: string;
  protected _matcher: RegExp;

  constructor(options?: SummaryControllerOptions) {
    options = options || {};
    super(options);
    // Settings for data summaries
    const summaries = options.summaries || {};
    this._enabled = summaries.dir || summaries.path;
    this._summariesFolder = summaries.dir || path.join(__dirname, '../../summaries');
    // Set up path matching
    this._summariesPath = summaries.path  || '/summaries/',
    this._matcher = new RegExp('^' + Util.toRegExp(this._summariesPath) + '(.+)$');
  }

  protected override _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void): void {
    if (!this._enabled)
      return next();

    let summaryMatch = this._matcher && this._matcher.exec(request.url!), datasource;
    if (datasource = summaryMatch && summaryMatch[1]) {
      const summaryFile = path.join(this._summariesFolder, datasource + '.ttl');

      // Read summary triples from file
      const streamParser = new StreamParser({ blankNodePrefix: '', baseIRI: this._baseUrl.pathname as string }),
          inputStream = fs.createReadStream(summaryFile);

      // If the summary cannot be read, invoke the next controller without error
      inputStream.on('error', (error) => { next(); });
      inputStream.pipe(streamParser);

      // Set caching
      response.setHeader('Cache-Control', 'public,max-age=604800'); // 14 days

      // Render the summary
      const view = this._negotiateView('Summary', request, response);
      view.render({ prefixes: this._prefixes, results: streamParser }, request, response);
    }
    else
      next();
  }
}

