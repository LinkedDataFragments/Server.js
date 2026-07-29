/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* An SummaryController responds to requests for summaries */

import Controller = require('@ldf/core/lib/controllers/Controller');
import * as fs from 'fs';
import * as path from 'path';
import { StreamParser } from 'n3';
import Util = require('@ldf/core/lib/Util');
import type { ControllerOptions, LdfRequest, LdfResponse } from '@ldf/core/lib/types';

interface SummaryControllerOptions extends ControllerOptions {
  summaries?: { dir?: string; path?: string };
}

// Creates a new SummaryController
class SummaryController extends Controller {
  protected _enabled?: string;
  protected _summariesFolder: string;
  protected _summariesPath: string;
  protected _matcher: RegExp;

  constructor(options?: SummaryControllerOptions) {
    options = options || {};
    super(options);
    // Settings for data summaries
    let summaries = options.summaries || {};
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
      let summaryFile = path.join(this._summariesFolder, datasource + '.ttl');

      // Read summary triples from file
      let streamParser = new StreamParser({ blankNodePrefix: '', baseIRI: this._baseUrl.pathname as string }),
          inputStream = fs.createReadStream(summaryFile);

      // If the summary cannot be read, invoke the next controller without error
      inputStream.on('error', (error) => { next(); });
      inputStream.pipe(streamParser);

      // Set caching
      response.setHeader('Cache-Control', 'public,max-age=604800'); // 14 days

      // Render the summary
      let view = this._negotiateView('Summary', request, response);
      view.render({ prefixes: this._prefixes, results: streamParser }, request, response);
    }
    else
      next();
  }
}

export = SummaryController;
