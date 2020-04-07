/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A SummaryRdfView represents a data summary in RDF. */

let RdfView = require('@ldf/core').views.RdfView;

// Creates a new SummaryRdfView
class SummaryRdfView extends RdfView {
  constructor(settings) {
    super('Summary', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  _generateRdf(settings, data, metadata, done) {
    // Add summary triples
    settings.results.on('data', data);
    settings.results.on('end',  done);
  }
}

module.exports = SummaryRdfView;
