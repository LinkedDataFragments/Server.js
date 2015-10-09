/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TemporalRdfViewExtension extends the Triple Pattern Fragments RDF view with a timerange gate link. */

var RdfView = require('../RdfView');

// Creates a new TemporalRdfViewExtension
function TemporalRdfViewExtension(settings) {
  if (!(this instanceof TemporalRdfViewExtension))
    return new TemporalRdfViewExtension(settings);
  RdfView.call(this, 'TriplePatternFragments:After', settings);
}
RdfView.extend(TemporalRdfViewExtension);

// Renders the view with the given settings to the response
TemporalRdfViewExtension.prototype._generateRdf = function (settings, request, response, done) {
  if(settings.metadata.timeRangeGate) {
    response(settings.datasource.url, 'http://hasTimeRangeGate', settings.metadata.timeRangeGate);
  }
  if(settings.metadata.timeRanges) {
    for(timeRange in settings.metadata.timeRanges) {
      var t = settings.metadata.timeRanges[timeRange];
      response(t.subject, t.predicate, t.object);
    }
  }
  done();
};

module.exports = TemporalRdfViewExtension;
