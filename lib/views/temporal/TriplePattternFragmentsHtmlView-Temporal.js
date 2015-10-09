/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TemporalHtmlViewExtension extends the Triple Pattern Fragments RDF view with a timerange gate link. */

var HtmlView = require('../HtmlView'),
    url      = require('url');

// Creates a new TemporalHtmlViewExtension
function TemporalHtmlViewExtension(settings) {
  if (!(this instanceof TemporalHtmlViewExtension))
    return new TemporalHtmlViewExtension(settings);
  HtmlView.call(this, 'TriplePatternFragments:Info', settings);
}
HtmlView.extend(TemporalHtmlViewExtension);

// Renders the view with the given settings to the response
TemporalHtmlViewExtension.prototype._render = function (settings, request, response, done) {
  if(settings.metadata.timeRangeGate) {
    this._renderTemplate('temporal/timerangegate-link', settings.metadata, request, response, done);
  } else {
    done();
  }
};

module.exports = TemporalHtmlViewExtension;
