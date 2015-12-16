/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A TimeRangeGateHtmlView represents a time range in HTML. */

var TriplePatternFragmentsHtmlView = require('../triplepatternfragments/TriplePatternFragmentsHtmlView'),
    url                            = require('url');

// Creates a new TimeRangeGate
function TimeRangeGateHtmlView(settings) {
  if (!(this instanceof TimeRangeGateHtmlView))
    return new TimeRangeGateHtmlView(settings);
  settings = settings || {};
  settings.viewNameOverride = 'TimeRangeGate';
  TriplePatternFragmentsHtmlView.call(this, settings);
}
TriplePatternFragmentsHtmlView.extend(TimeRangeGateHtmlView);

TimeRangeGateHtmlView.prototype.viewDirectory = 'timerangegate/';

// Renders the view with the given settings to the response
TimeRangeGateHtmlView.prototype._render = function (settings, request, response, done) {
  // Read the data and metadata
  var self = this, resultStream = settings.resultStream;
  resultStream.on('end',  function () {     settings.metadata && renderHtml(); });
  resultStream.on('metadata', function () { settings.triples  && renderHtml(); });

  // Generates the HTML after the data and metadata have been retrieved
  function renderHtml() {
    var template = settings.datasource.role === 'index' ? 'index' : 'datasource';
    settings.extensions = { Info: null };
    settings.timeRanges = settings.triples;
    self._renderTemplate(self.viewDirectory + template, settings, request, response, done);
  }
};

module.exports = TimeRangeGateHtmlView;
