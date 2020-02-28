/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

module.exports = {
  controllers: {
    QuadPatternFragmentsController: require('./lib/controllers/QuadPatternFragmentsController'),
  },
  routers: {
    QuadPatternRouter: require('./lib/routers/QuadPatternRouter'),
  },
  views: {
    quadpatternfragments: {
      QuadPatternFragmentsHtmlView: require('./lib/views/quadpatternfragments/QuadPatternFragmentsHtmlView'),
      QuadPatternFragmentsRdfView: require('./lib/views/quadpatternfragments/QuadPatternFragmentsRdfView'),
    },
  },
};
