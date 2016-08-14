/*! @license MIT ©2016 Ruben Verborgh - Ghent University / iMinds */
/* A MementoHtmlViewExtension extends the Triple Pattern Fragments HTML view with Memento details. */

var HtmlView = require('../HtmlView');

// Creates a new MementoHtmlViewExtension
function MementoHtmlViewExtension(settings) {
  if (!(this instanceof MementoHtmlViewExtension))
    return new MementoHtmlViewExtension(settings);
  HtmlView.call(this, 'TriplePatternFragments:Before', settings);
}
HtmlView.extend(MementoHtmlViewExtension);

// Renders the view with the given settings to the response
MementoHtmlViewExtension.prototype._render = function (settings, request, response, done) {
  if (!settings.datasource.memento)
    return done();
  this._renderTemplate('memento/memento-details', {
    start: settings.datasource.memento.interval[0],
    end:   settings.datasource.memento.interval[1],
  }, request, response, done);
};

module.exports = MementoHtmlViewExtension;
