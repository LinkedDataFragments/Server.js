/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
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
  var self = this, triples = [], resultStream = settings.resultStream;
  resultStream.on('data', function (triple) { triples.push(triple); });
  resultStream.on('end',  function () { settings.triples = triples; settings.metadata && renderHtml(); });
  resultStream.on('metadata', function (m) { settings.metadata = m; settings.triples  && renderHtml(); });

  // Generates the HTML after the data and metadata have been retrieved
  function renderHtml() {
    var template = settings.datasource.role === 'index' ? 'index' : 'datasource';
    settings.extensions = { Before: null, After: null };
    self._renderTemplate('triplepatternfragments/' + template, settings, request, response, done);
  }
};

module.exports = TriplePatternFragmentsHtmlView;
