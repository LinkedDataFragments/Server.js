/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the summary views of this package */

import { SummaryHtmlViewExtension } from './QuadPatternFragmentsHtmlView-Summary';
import { SummaryRdfViewExtension } from './QuadPatternFragmentsRdfView-Summary';
import { SummaryRdfView } from './SummaryRdfView';

module.exports = {
  'QuadPatternFragmentsHtmlView-Summary': SummaryHtmlViewExtension,
  'QuadPatternFragmentsRdfView-Summary': SummaryRdfViewExtension,
  'SummaryRdfView': SummaryRdfView,
};
