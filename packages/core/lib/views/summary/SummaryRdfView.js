/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A SummaryRdfView represents a data summary in RDF. */

var RdfView = require('../RdfView');

// Creates a new SummaryRdfView
function SummaryRdfView(settings) {
  if (!(this instanceof SummaryRdfView))
    return new SummaryRdfView(settings);
  RdfView.call(this, 'Summary', settings);
}
RdfView.extend(SummaryRdfView);

// Generates triples and quads by sending them to the data and/or metadata callbacks
SummaryRdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  // Add summary triples
  settings.results.on('data', data);
  settings.results.on('end',  done);
};

module.exports = SummaryRdfView;
