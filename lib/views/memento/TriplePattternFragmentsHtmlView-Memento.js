/*! @license ©2016 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A MementoHtmlViewExtension extends the Triple Pattern Fragments HTML view with Memento details. */

var HtmlView = require('../HtmlView');

// Creates a new MementoHtmlViewExtension
function MementoHtmlViewExtension(settings) {
  if (!(this instanceof MementoHtmlViewExtension))
    return new MementoHtmlViewExtension(settings);
  HtmlView.call(this, 'TriplePatternFragments:Info', settings);
}
HtmlView.extend(MementoHtmlViewExtension);

// Renders the view with the given settings to the response
MementoHtmlViewExtension.prototype._render = function (settings, request, response, done) {
  if (settings.datasource.memento)
    this._renderTemplate('memento/memento-details', settings, request, response, done);
  else
    done();
};

module.exports = MementoHtmlViewExtension;
