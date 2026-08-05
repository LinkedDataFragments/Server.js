/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A DeferenceController responds to dereferencing requests */

import { Controller } from './Controller';
import * as url from 'url';
import * as _ from 'lodash';
import * as Util from '../Util';
import type { ControllerOptions, LdfRequest, LdfResponse } from '../types';
import type { Datasource } from '../datasources/Datasource';

// Creates a new DeferenceController
export class DeferenceController extends Controller {
  protected _paths: Record<string, Datasource>;
  protected _matcher: RegExp;

  constructor(options?: ControllerOptions) {
    options = options || {};
    super(options);
    let paths = this._paths = options.dereference || {};
    this._matcher = /$0^/;
    if (!_.isEmpty(paths))
      this._matcher = new RegExp('^(' + Object.keys(paths).map(Util.toRegExp).join('|') + ')');
  }

  // Dereferences a URL by redirecting to its subject fragment of a certain data source
  protected override _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void): void {
    let match = this._matcher.exec(request.url!), datasource: Datasource | null;
    if (datasource = match && this._paths[match[1]]) {
      let entity = url.format(_.defaults({
        pathname: datasource.path,
        query: { subject: url.format(request.parsedUrl!) },
      }, request.parsedUrl));
      response.writeHead(303, { 'Location': entity, 'Content-Type': Util.MIME_PLAINTEXT });
      response.end(entity);
    }
    else
      next();
  }
}

