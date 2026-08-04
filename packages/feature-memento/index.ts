/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

module.exports = {
  controllers: {
    TimegateController: require('./lib/controllers/TimegateController'),
    MementoControllerExtension: require('./lib/controllers/MementoControllerExtension'),
  },
  views: {
    memento: {
      'QuadPatternFragmentsHtmlView-Memento': require('./lib/views/memento/QuadPatternFragmentsHtmlView-Memento'),
    },
  },
};
