/*! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
/* A MementoHtmlViewExtension extends the Quad Pattern Fragments HTML view with Memento details. */

var HtmlView = require('../HtmlView'),
    TimegateController = require('../../controllers/TimegateController'),
    path = require('path');

// Creates a new MementoHtmlViewExtension
function MementoHtmlViewExtension(settings) {
  if (!(this instanceof MementoHtmlViewExtension))
    return new MementoHtmlViewExtension(settings);
  HtmlView.call(this, 'QuadPatternFragments:Before', settings);

  var timegates = settings.timegates || {};
  this._invertedTimegateMap = TimegateController.parseInvertedTimegateMap(timegates.mementos,
    settings.datasources, settings.urlData);
}
HtmlView.extend(MementoHtmlViewExtension);

// Renders the view with the given settings to the response
MementoHtmlViewExtension.prototype._render = function (settings, request, response, done) {
  var memento = this._invertedTimegateMap[settings.datasource.id];
  if (!memento)
    return done();
  this._renderTemplate(path.join(__dirname, 'memento-details'), {
    start: memento.interval[0],
    end:   memento.interval[1],
  }, request, response, done);
};

module.exports = MementoHtmlViewExtension;
