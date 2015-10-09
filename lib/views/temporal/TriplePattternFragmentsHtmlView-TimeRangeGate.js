/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TimeRangeGateHtmlViewExtension extends the Triple Pattern Fragments HTML view with a summary link. */

var HtmlView = require('../HtmlView'),
    url      = require('url');

// Creates a new SummaryHtmlViewExtension
function TimeRangeGateHtmlViewExtension(settings) {
  if (!(this instanceof TimeRangeGateHtmlViewExtension))
    return new TimeRangeGateHtmlViewExtension(settings);
  HtmlView.call(this, 'TriplePatternFragments:Info', settings);
}
HtmlView.extend(TimeRangeGateHtmlViewExtension);

// Renders the view with the given settings to the response
TimeRangeGateHtmlViewExtension.prototype._render = function (settings, request, response, done) {
  // If this is a timerange gate, show all timeranges.
  if (settings.query.features.timeRangeGate) {
    var options = {};
    options.timeranges = [];
    settings.metadata.timeRanges.forEach(function(triple) {
      var parsed = url.parse(triple.subject, true);
      options.timeranges.push({
        url: triple.subject,
        initial: parsed.query.initial,
        final: parsed.query.final
      });
    });
    this._renderTemplate('temporal/timerange-link', options, request, response, done);
  }
  else
    done();
};

module.exports = TimeRangeGateHtmlViewExtension;
