/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Controller is a base class for HTTP request handlers */

import * as url from 'url';
import type { Url, UrlObject } from 'url';
import * as _ from 'lodash';
import { ViewCollection } from '../views/ViewCollection';
import { UrlData } from '../UrlData';
import * as Util from '../Util';
import type { ControllerOptions, DatasourceRegistry, LdfRequest, LdfResponse, ViewSettings } from '../types';
import type { View } from '../views/View';

interface ForwardedElement {
  by?: string;
  for?: string;
  host?: string;
  proto?: string;
}
// forwarded-parse ships no types of its own and has no @types package.
const parseForwarded = require('forwarded-parse') as (header: string) => ForwardedElement[];

// Duck-types a ViewCollection, matching the original check's semantics
function isViewCollection(views: View[] | ViewCollection | undefined): views is ViewCollection {
  return !!(views as ViewCollection | undefined)?.matchView;
}

// Creates a new Controller
export class Controller {
  _first?: boolean;
  _last?: boolean;
  protected _prefixes: Record<string, string>;
  protected _datasources: DatasourceRegistry;
  protected _views: ViewCollection;
  protected _baseUrl: Record<keyof Url, string | boolean | undefined>;

  constructor(options?: ControllerOptions) {
    options = options || {};
    this._prefixes = options.prefixes || {};
    this._datasources = _.reduce(options.datasources || {}, (datasources: DatasourceRegistry, value, key) => {
      // If the path does not start with a slash, add one.
      datasources[key.replace(/^(?!\/)/, '/')] = value;
      return datasources;
    }, {} as DatasourceRegistry);
    this._views = isViewCollection(options.views) ? options.views : new ViewCollection(options.views);

    // Set up base URL (if we're behind a proxy, this allows reconstructing the actual request URL)
    this._baseUrl = _.mapValues(url.parse((options.urlData || new UrlData()).baseURL), (value, key) => {
      return value && !/^(?:href|path|search|hash)$/.test(key) ? value : undefined;
    });
  }

  // Tries to process the HTTP request
  handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void, settings?: ViewSettings): void {
    // Add a `parsedUrl` field to `request`,
    // containing the parsed request URL, resolved against the base URL
    if (!request.parsedUrl) {
      // Keep the request's path and query, but take over all other defined baseURL properties
      // _baseUrl is cast below since lodash's mapValues collapses its value type to a
      // single union, which doesn't line up field-by-field with UrlObject.
      request.parsedUrl = _.defaults(_.pick(url.parse(request.url!, true), 'path', 'pathname', 'query'),
        this._getForwarded(request),
        this._getXForwardHeaders(request),
        this._baseUrl,
        { protocol: 'http:', host: request.headers.host }) as UrlObject;
    }

    // Try to handle the request
    let self: Controller | null = this;
    try { this._handleRequest(request, response, done, settings); }
    catch (error) { done(Util.toError(error)); }
    function done(error?: Error) {
      if (self) {
        // Send a 406 response if no suitable view was found
        if (error instanceof ViewCollection.ViewCollectionError)
          return self._handleNotAcceptable(request, response, next);
        self = null;
        next(error);
      }
    }
  }

  // Get host and protocol from HTTP's Forwarded header
  protected _getForwarded(request: LdfRequest): { protocol?: string; host?: string } {
    if (!request.headers.forwarded)
      return {};
    try {
      let forwarded: { proto?: string; host?: string } = _.defaults.apply(this, parseForwarded(request.headers.forwarded) as [ForwardedElement, ...ForwardedElement[]]);
      return {
        protocol: forwarded.proto ? forwarded.proto + ':' : undefined,
        host: forwarded.host,
      };
    }
    catch (error) { return {}; }
  }

  // Get host and protocol from HTTP's X-Forwarded-* headers
  protected _getXForwardHeaders(request: LdfRequest): { protocol?: string; host?: string | string[] } {
    return {
      protocol: request.headers['x-forwarded-proto'] ? (request.headers['x-forwarded-proto'] as string) + ':' : undefined,
      host: request.headers['x-forwarded-host'],
    };
  }

  // Tries to process the HTTP request in an implementation-specific way
  protected _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void, settings?: ViewSettings): void {
    next();
  }

  // Serves an error indicating content negotiation failure
  protected _handleNotAcceptable(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void): void {
    response.writeHead(406, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('No suitable content type found.\n');
  }

  // Finds an appropriate view using content negotiation
  protected _negotiateView(viewName: string, request: LdfRequest, response: LdfResponse) {
    // Indicate that the response is content-negotiated
    let vary = response.getHeader('Vary');
    response.setHeader('Vary', 'Accept' + (vary ? ', ' + (vary as string) : ''));
    // Negotiate a view
    let viewMatch = this._views.matchView(viewName, request);
    response.setHeader('Content-Type', viewMatch.responseType || viewMatch.type);
    return viewMatch.view;
  }

  // Cleans resources used by the controller
  close(): void { }
}

