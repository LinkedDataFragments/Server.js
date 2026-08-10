/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import type * as Types from './lib/types';

import { AssetsController } from './lib/controllers/AssetsController';
import { Controller } from './lib/controllers/Controller';
import { DeferenceController as DereferenceController } from './lib/controllers/DereferenceController';
import { ErrorController } from './lib/controllers/ErrorController';
import { NotFoundController } from './lib/controllers/NotFoundController';

import { Datasource } from './lib/datasources/Datasource';
import { EmptyDatasource } from './lib/datasources/EmptyDatasource';
import { IndexDatasource } from './lib/datasources/IndexDatasource';
import { MemoryDatasource } from './lib/datasources/MemoryDatasource';

import { DatasourceRouter } from './lib/routers/DatasourceRouter';
import { PageRouter } from './lib/routers/PageRouter';

import { ErrorHtmlView } from './lib/views/error/ErrorHtmlView';
import { ErrorRdfView } from './lib/views/error/ErrorRdfView';
import { ForbiddenHtmlView } from './lib/views/forbidden/ForbiddenHtmlView';
import { NotFoundHtmlView } from './lib/views/notfound/NotFoundHtmlView';
import { NotFoundRdfView } from './lib/views/notfound/NotFoundRdfView';
import { HtmlView } from './lib/views/HtmlView';
import { RdfView } from './lib/views/RdfView';
import { View } from './lib/views/View';
import { ViewCollection } from './lib/views/ViewCollection';

import { runCli, runCustom } from './lib/CliRunner';
import { LinkedDataFragmentsServer } from './lib/LinkedDataFragmentsServer';
import { LinkedDataFragmentsServerWorker } from './lib/LinkedDataFragmentsServerWorker';
import { UrlData } from './lib/UrlData';
import * as Util from './lib/Util';

const Core = {
  controllers: {
    AssetsController,
    Controller,
    DereferenceController,
    ErrorController,
    NotFoundController,
  },
  datasources: {
    Datasource,
    EmptyDatasource,
    IndexDatasource,
    MemoryDatasource,
  },
  routers: {
    DatasourceRouter,
    PageRouter,
  },
  views: {
    error: {
      ErrorHtmlView,
      ErrorRdfView,
    },
    forbidden: {
      ForbiddenHtmlView,
    },
    notfound: {
      NotFoundHtmlView,
      NotFoundRdfView,
    },
    HtmlView,
    RdfView,
    View,
    ViewCollection,
  },
  runCli,
  runCustom,
  LinkedDataFragmentsServer,
  LinkedDataFragmentsServerWorker,
  UrlData,
  Util,
};

// Re-exports this package's shared type definitions, so consumers can pull
// them from the package root instead of reaching into `@ldf/core/lib/types`
namespace Core {
  export type QueryFeatures = Types.QueryFeatures;
  export type Query = Types.Query;
  export type DatasourceRegistry = Types.DatasourceRegistry;
  export type Pushable<T> = Types.Pushable<T>;
  export type DatasourceOptions = Types.DatasourceOptions;
  export type RenderDone = Types.RenderDone;
  export type LdfRequest = Types.LdfRequest;
  export type LdfResponse = Types.LdfResponse;
  export type RouterRequest = Types.RouterRequest;
  export type ControllerOptions = Types.ControllerOptions;
  export type ViewSettings = Types.ViewSettings;
  export type RdfViewSettings = Types.RdfViewSettings;
  export type WorkerConfig = Types.WorkerConfig;
}

export = Core;
