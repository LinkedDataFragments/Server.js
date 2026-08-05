/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import { TimegateController } from './lib/controllers/TimegateController';
import { MementoControllerExtension } from './lib/controllers/MementoControllerExtension';
import { MementoHtmlViewExtension } from './lib/views/memento/QuadPatternFragmentsHtmlView-Memento';

module.exports = {
  controllers: {
    TimegateController,
    MementoControllerExtension,
  },
  views: {
    memento: {
      'QuadPatternFragmentsHtmlView-Memento': MementoHtmlViewExtension,
    },
  },
};
