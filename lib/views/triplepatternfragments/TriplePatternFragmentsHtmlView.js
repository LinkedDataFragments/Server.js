/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A TriplePatternFragmentsRdfView represents a Triple Pattern Fragment in HTML. */

var HtmlView = require('../HtmlView');

// Creates a new TriplePatternFragmentsHtmlView
function TriplePatternFragmentsHtmlView(settings) {
  if (!(this instanceof TriplePatternFragmentsHtmlView))
    return new TriplePatternFragmentsHtmlView(settings);
  HtmlView.call(this, 'TriplePatternFragments', settings);
}
HtmlView.extend(TriplePatternFragmentsHtmlView);

// Renders the view with the given settings to the response
TriplePatternFragmentsHtmlView.prototype._render = function (settings, request, response, done) {
  // Read the data and metadata
  var self = this, triples = settings.triples = [], results = settings.results;
  results.on('data', function (triple) { triples.push(triple); });
  results.on('end',  function () { settings.metadata && renderHtml(); });
  results.getProperty('metadata', function (metadata) {
    settings.metadata = metadata;
    results.ended && renderHtml();
  });

  // Generates the HTML after the data and metadata have been retrieved
  function renderHtml() {
    var template = settings.datasource.role === 'index' ? 'index' : 'datasource';
    settings.extensions = { Before: null, After: null };
    self._renderTemplate('triplepatternfragments/' + template, settings, request, response, done);
  }
};

module.exports = TriplePatternFragmentsHtmlView;
