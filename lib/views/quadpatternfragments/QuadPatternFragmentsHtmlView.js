/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A QuadPatternFragmentsRdfView represents a TPF or QPF in HTML. */

var HtmlView = require('../HtmlView');

// Creates a new QuadPatternFragmentsHtmlView
function QuadPatternFragmentsHtmlView(settings) {
  if (!(this instanceof QuadPatternFragmentsHtmlView))
    return new QuadPatternFragmentsHtmlView(settings);
  HtmlView.call(this, 'QuadPatternFragments', settings);
}
HtmlView.extend(QuadPatternFragmentsHtmlView);

QuadPatternFragmentsHtmlView.prototype.viewDirectory = 'quadpatternfragments/';

// Renders the view with the given settings to the response
QuadPatternFragmentsHtmlView.prototype._render = function (settings, request, response, done) {
  // Read the data and metadata
  var self = this, quads = settings.quads = [], results = settings.results;
  results.on('data', function (triple) { quads.push(triple); });
  results.on('end',  function () { settings.metadata && renderHtml(); });
  results.getProperty('metadata', function (metadata) {
    settings.metadata = metadata;
    results.ended && renderHtml();
  });

  // Generates the HTML after the data and metadata have been retrieved
  function renderHtml() {
    var template = settings.datasource.role === 'index' ? 'index' : 'datasource';
    settings.extensions = { Before: null, FormBefore: null, FormAfter: null, QuadBefore: 'function', QuadAfter: 'function', After: null };
    self._renderTemplate(self.viewDirectory + template, settings, request, response, done);
  }
};

module.exports = QuadPatternFragmentsHtmlView;
