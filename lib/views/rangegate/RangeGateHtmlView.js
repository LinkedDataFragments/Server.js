/*! @license ©2016 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A RangeGateRdfView represents a Range Gate in HTML. */

var TriplePatternFragmentsHtmlView = require('../triplepatternfragments/TriplePatternFragmentsHtmlView');

// Creates a new TriplePatternFragmentsHtmlView
function RangeGateHtmlView(settings) {
  if (!(this instanceof RangeGateHtmlView))
    return new RangeGateHtmlView(settings);
  settings = settings || {};
  settings.viewNameOverride = 'RangeGate';
  TriplePatternFragmentsHtmlView.call(this, settings);
}
TriplePatternFragmentsHtmlView.extend(RangeGateHtmlView);

RangeGateHtmlView.prototype.viewDirectory = 'rangegate/';

// Renders the view with the given settings to the response
RangeGateHtmlView.prototype._render = function (settings, request, response, done) {
  // Read the data and metadata
  var self = this, ranges = [], resultStream = settings.resultStream;
  resultStream.on('data', function (range) { ranges.push(range); });
  resultStream.on('end',    function () { settings.ranges = ranges; settings.metadata && renderHtml(); });
  resultStream.on('metadata', function (m) { settings.metadata = m; settings.ranges   && renderHtml(); });

  // Generates the HTML after the data and metadata have been retrieved
  function renderHtml() {
    var template = settings.datasource.role === 'index' ? 'index' : 'datasource';
    settings.extensions = { Info: null };
    self._renderTemplate(self.viewDirectory + template, settings, request, response, done);
  }
};

module.exports = RangeGateHtmlView;
