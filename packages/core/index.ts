/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import type * as Types from './lib/types';

import * as controllers from './lib/controllers';
import * as datasources from './lib/datasources';
import * as routers from './lib/routers';
import * as views from './lib/views';

import { runCli, runCustom } from './lib/CliRunner';
import { LinkedDataFragmentsServer } from './lib/LinkedDataFragmentsServer';
import { LinkedDataFragmentsServerWorker } from './lib/LinkedDataFragmentsServerWorker';
import { UrlData } from './lib/UrlData';
import * as Util from './lib/Util';

const Core = {
  controllers,
  datasources,
  routers,
  views,
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
