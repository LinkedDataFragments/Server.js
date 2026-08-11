/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Controller is a base class for HTTP request handlers */

import * as url from 'url';
import type { Url, UrlObject } from 'url';
import * as _ from 'lodash';
import { ViewCollection } from '../views/ViewCollection';
import { UrlData } from '../UrlData';
import * as Util from '../Util';
import type { ControllerOptions, DatasourceRegistry, LdfRequest, LdfResponse, NonEmptyArray, ViewSettings } from '../types';
import type { View } from '../views/View';

// A single element of the HTTP Forwarded header (RFC 7239)
interface ForwardedElement {

  /** The interface where the request came in to the proxy server */
  by?: string;

  /** The client that initiated the request */
  for?: string;

  /** The Host request header field as received by the proxy */
  host?: string;

  /** The protocol used to make the request */
  proto?: string;
}
// TODO: installed forwarded-parse (2.1.0) ships no types. Bump and re-evaluate whether to keep this cast.
const parseForwarded = require('forwarded-parse') as (header: string) => ForwardedElement[];

// Type guard for ViewCollection, duck-typed to match the original check's semantics
function isViewCollection(views: View[] | ViewCollection | undefined): views is ViewCollection {
  return !!(views as ViewCollection | undefined)?.matchView;
}

/**
 * Base class for HTTP request handlers.
 * Controllers are chained: each instance's `handleRequest` either handles the
 * request itself or calls `next` to hand it off to the next controller in the chain.
 */
export class Controller {
  _first?: boolean;
  _last?: boolean;
  protected _prefixes: Record<string, string>;
  protected _datasources: DatasourceRegistry;
  protected _views: ViewCollection;
  protected _baseUrl: Record<keyof Url, string | boolean | undefined>;

  /**
   * Creates a new Controller
   * @param options - Prefixes, datasources, views, and base URL data shared by the controller chain
   */
  constructor(options?: ControllerOptions) {
    options = options || {};
    this._prefixes = options.prefixes || {};
    this._datasources = _.reduce(options.datasources || {}, (datasources: DatasourceRegistry, value, key) => {
      // If the path does not start with a slash, add one.
      datasources[key.replace(/^(?!\/)/, '/')] = value;
      return datasources;
    }, {} satisfies DatasourceRegistry);
    this._views = isViewCollection(options.views) ? options.views : new ViewCollection(options.views);

    // Set up base URL (if we're behind a proxy, this allows reconstructing the actual request URL)
    this._baseUrl = _.mapValues(url.parse((options.urlData || new UrlData()).baseURL), (value, key) => {
      return value && !/^(?:href|path|search|hash)$/.test(key) ? value : undefined;
    });
  }

  /**
   * Tries to process the HTTP request.
   * Resolves `request.parsedUrl` against the base URL and any proxy-forwarded
   * headers if not already set, then delegates to `_handleRequest`. If that
   * throws or a suitable view can't be found, reports a 406 response instead.
   * @param request - The incoming HTTP request
   * @param response - The HTTP response to write to
   * @param next - Called when the request could not be handled by this controller, with an error if one occurred
   * @param settings - Additional view-rendering settings to pass through
   */
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

  /**
   * Gets the host and protocol from HTTP's Forwarded header (RFC 7239), if present.
   * Returns an empty object if the header is missing or fails to parse.
   */
  protected _getForwarded(request: LdfRequest): { protocol?: string; host?: string } {
    if (!request.headers.forwarded)
      return {};
    try {
      let forwarded: { proto?: string; host?: string } = _.defaults.apply(this, parseForwarded(request.headers.forwarded) as NonEmptyArray<ForwardedElement>);
      return {
        protocol: forwarded.proto ? forwarded.proto + ':' : undefined,
        host: forwarded.host,
      };
    }
    catch (error) { return {}; }
  }

  /**
   * Gets the host and protocol from HTTP's non-standard X-Forwarded-Proto/X-Forwarded-Host
   * headers, as an alternative to the standardized Forwarded header.
   */
  protected _getXForwardHeaders(request: LdfRequest): { protocol?: string; host?: string | string[] } {
    return {
      protocol: request.headers['x-forwarded-proto'] ? (request.headers['x-forwarded-proto'] as string) + ':' : undefined,
      host: request.headers['x-forwarded-host'],
    };
  }

  /**
   * Tries to process the HTTP request in an implementation-specific way.
   * The base implementation just hands off to `next`; subclasses override this
   * to actually handle requests, calling `next` themselves when they don't apply.
   */
  protected _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void, settings?: ViewSettings): void {
    next();
  }

  /** Serves a 406 Not Acceptable response, indicating no view could satisfy content negotiation */
  protected _handleNotAcceptable(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void): void {
    response.writeHead(406, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('No suitable content type found.\n');
  }

  /**
   * Finds an appropriate view using content negotiation, sets the response's
   * Vary and Content-Type headers accordingly, and returns the matched view.
   */
  protected _negotiateView(viewName: string, request: LdfRequest, response: LdfResponse) {
    // Indicate that the response is content-negotiated
    let vary = response.getHeader('Vary');
    response.setHeader('Vary', 'Accept' + (vary ? ', ' + (vary as string) : ''));
    // Negotiate a view
    let viewMatch = this._views.matchView(viewName, request);
    response.setHeader('Content-Type', viewMatch.responseType || viewMatch.type);
    return viewMatch.view;
  }

  /** Cleans up resources used by the controller. */
  close(): void { }
}

