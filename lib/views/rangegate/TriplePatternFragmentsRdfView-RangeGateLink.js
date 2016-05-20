/*! @license ©2016 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A RangeGateLinkRdfViewExtension extends the Triple Pattern Fragments RDF view with a link to the datasource index. */

var RdfView = require('../RdfView'),
    HtmlView = require('./TriplePatternFragmentsHtmlView-RangeGateLink');

var mdi = 'http://example.org/multidimensionalindex#'; // TODO

// Creates a new RangeGateLinkRdfViewExtension
function RangeGateLinkRdfViewExtension(settings) {
  if (!(this instanceof RangeGateLinkRdfViewExtension))
    return new RangeGateLinkRdfViewExtension(settings);
  RdfView.call(this, 'TriplePatternFragments:After', settings);
}
RdfView.extend(RangeGateLinkRdfViewExtension);

// Generates triples and quads by sending them to the data and/or metadata callbacks
RangeGateLinkRdfViewExtension.prototype._generateRdf = function (settings, data, metadata, done) {
  HtmlView.prototype.loopIndexes(settings, function(nextDone) {
    metadata(settings.datasource.url, mdi + 'hasRangeGate', settings.indexurl);
    nextDone();
  }, done);
};

module.exports = RangeGateLinkRdfViewExtension;
