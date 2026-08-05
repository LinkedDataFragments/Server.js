/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorController responds to requests that caused an error */

import { Controller } from './Controller';
import * as Util from '../Util';
import type { ControllerOptions, LdfRequest, LdfResponse } from '../types';

// Creates a new ErrorController
export class ErrorController extends Controller {
  constructor(options?: ControllerOptions) {
    super(options);
  }

  // Serves an error response
  protected override _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void): void {
    // Try to write an error response through an appropriate view
    let error = response.error || (response.error = new Error('Unknown error')),
        view = this._negotiateView('Error', request, response),
        metadata = { prefixes: this._prefixes, datasources: this._datasources, error: error };
    response.writeHead(500);
    view.render(metadata, request, response);
  }

  // Writes the error in plaintext if no view was found
  protected override _handleNotAcceptable(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void): void {
    response.writeHead(500, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('Application error: ' + response.error!.message + '\n');
  }
}

