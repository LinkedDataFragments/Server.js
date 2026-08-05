/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import { QuadPatternFragmentsController } from './lib/controllers/QuadPatternFragmentsController';
import { QuadPatternRouter } from './lib/routers/QuadPatternRouter';
import { QuadPatternFragmentsHtmlView } from './lib/views/quadpatternfragments/QuadPatternFragmentsHtmlView';
import { QuadPatternFragmentsRdfView } from './lib/views/quadpatternfragments/QuadPatternFragmentsRdfView';

module.exports = {
  controllers: {
    QuadPatternFragmentsController,
  },
  routers: {
    QuadPatternRouter,
  },
  views: {
    quadpatternfragments: {
      QuadPatternFragmentsHtmlView,
      QuadPatternFragmentsRdfView,
    },
  },
};
