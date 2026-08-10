/*! @license MIT ©2026 Ghent University - imec */
/* Shared type definitions for @ldf/core */

import type { DataFactory, Term } from 'rdf-js';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http';
import type { ParsedUrlQuery } from 'querystring';
import type { UrlObject } from 'url';
import type { BufferedIterator } from 'asynciterator';
import type { Datasource } from './datasources/Datasource';
import type { UrlData } from './UrlData';
import type { View } from './views/View';
import type { ViewCollection } from './views/ViewCollection';
import type { Controller } from './controllers/Controller';

/**
 * Features a query can require a datasource to support — datasource
 * subclasses declare their own supportedFeatureList (see Datasource's
 * constructor), so this isn't a closed set.
 */
export interface QueryFeatures {
  datasource?: boolean;
  limit?: boolean;
  offset?: boolean;
  quadPattern?: boolean;
  triplePattern?: boolean;
  totalCount?: boolean;
  [feature: string]: boolean | undefined;
}

// A quad pattern query, as built up by routers and executed by datasources
export interface Query {
  features?: QueryFeatures;
  datasource?: string;
  subject?: Term;
  predicate?: Term;
  object?: Term;
  graph?: Term;
  limit?: number;
  offset?: number;
  page?: number;
  patternString?: string;
}

// A registry of datasources keyed by their path
export type DatasourceRegistry = Record<string, Datasource>;

export type Pushable<T> = BufferedIterator<T> & { _push(item: T): void };

export type NonEmptyArray<T> = [T, ...T[]];

// Options accepted by the Datasource base class constructor
export interface DatasourceOptions {
  urlData?: UrlData;
  path?: string;
  skolemizeBlacklist?: Record<string, boolean>;
  title?: string;
  id?: string;
  hide?: boolean;
  enabled?: boolean;
  description?: string;
  license?: string;
  licenseUrl?: string;
  copyright?: string;
  homepage?: string;
  request?: (...args: any[]) => any;
  dataFactory?: DataFactory;
  graph?: string;
  quads?: boolean;
  // MemoryDatasource-specific
  file?: string;
  url?: string;
  // IndexDatasource-specific
  datasources?: DatasourceRegistry;
}

export type RenderDone = (error?: Error | null) => void;

export interface LdfRequest extends IncomingMessage {
  parsedUrl?: UrlObject;
}

export interface LdfResponse extends ServerResponse {
  error?: Error;
}

// The (already-parsed) request shape routers' extractQueryParams receives —
// note this is distinct from LdfRequest: callers pass { url: request.parsedUrl, headers }.
export interface RouterRequest {
  url?: { pathname?: string; query?: ParsedUrlQuery };
  headers?: IncomingHttpHeaders;
}

// Options accepted by the Controller base class (and its subclasses) constructor
export interface ControllerOptions {
  urlData?: UrlData;
  prefixes?: Record<string, string>;
  datasources?: DatasourceRegistry;
  views?: View[] | ViewCollection;
  // AssetsController-specific
  assetsFolders?: string[];
  // DereferenceController-specific
  dereference?: Record<string, Datasource>;
}

// Settings passed through the view-rendering pipeline; grows dynamically as
// extensions add their own context keys, so a permissive index signature is
// a deliberate exception rather than a general escape hatch.
export interface ViewSettings {
  dataFactory?: DataFactory;
  urlData?: UrlData;
  views?: View[] | ViewCollection;
  title?: string;
  header?: string;
  contentType?: string;
  prefixes?: Record<string, string>;
  datasources?: DatasourceRegistry;
  viewPathBase?: string;
  [key: string]: any;
}

// ViewSettings with dataFactory guaranteed present, as required by RdfView and its subclasses
export type RdfViewSettings = ViewSettings & { dataFactory: DataFactory };

// Configuration consumed by LinkedDataFragmentsServerWorker
export interface WorkerConfig extends ControllerOptions {
  datasources: DatasourceRegistry;
  controllers: Controller[];
  routers: unknown[];
  logging: { enabled?: boolean; file?: string };
  log?: (...args: any[]) => void;
  accesslogger?: (request: LdfRequest, response: LdfResponse) => void;
  port?: number;
  workers?: number;
}
