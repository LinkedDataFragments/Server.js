/*! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
/* A MementoHtmlViewExtension extends the Quad Pattern Fragments HTML view with Memento details. */

let HtmlView = require('@ldf/core').views.HtmlView,
    TimegateController = require('../../controllers/TimegateController'),
    path = require('path');

// Creates a new MementoHtmlViewExtension
class MementoHtmlViewExtension extends HtmlView {
  constructor(settings) {
    super('QuadPatternFragments:Before', settings);
    let timegates = settings.timegates || {};
    this._invertedTimegateMap = TimegateController.parseInvertedTimegateMap(timegates.mementos, settings.urlData);
  }

  // Renders the view with the given settings to the response
  _render(settings, request, response, done) {
    let memento = this._invertedTimegateMap[settings.datasource.id];
    if (!memento)
      return done();
    this._renderTemplate(path.join(__dirname, 'memento-details'), {
      start: memento.interval[0],
      end:   memento.interval[1],
    }, request, response, done);
  }
}

module.exports = MementoHtmlViewExtension;
