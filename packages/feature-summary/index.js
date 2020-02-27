/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

module.exports = {
  controllers: {
    SummaryController: require('./lib/controllers/SummaryController'),
  },
  views: {
    summary: {
      'QuadPatternFragmentsHtmlView-Memento': require('./lib/views/summary/QuadPatternFragmentsHtmlView-Summary'),
      'QuadPatternFragmentsRdfView-Memento': require('./lib/views/summary/QuadPatternFragmentsRdfView-Summary'),
      'SummaryRdfView': require('./lib/views/summary/SummaryRdfView'),
    },
  },
};
