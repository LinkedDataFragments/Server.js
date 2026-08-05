/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

import { SummaryController } from './lib/controllers/SummaryController';
import { SummaryHtmlViewExtension } from './lib/views/summary/QuadPatternFragmentsHtmlView-Summary';
import { SummaryRdfViewExtension } from './lib/views/summary/QuadPatternFragmentsRdfView-Summary';
import { SummaryRdfView } from './lib/views/summary/SummaryRdfView';

module.exports = {
  controllers: {
    SummaryController,
  },
  views: {
    summary: {
      'QuadPatternFragmentsHtmlView-Summary': SummaryHtmlViewExtension,
      'QuadPatternFragmentsRdfView-Summary': SummaryRdfViewExtension,
      'SummaryRdfView': SummaryRdfView,
    },
  },
};
