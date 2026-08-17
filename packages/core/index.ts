/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

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

export = Core;
