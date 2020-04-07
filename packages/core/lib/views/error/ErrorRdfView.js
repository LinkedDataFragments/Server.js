/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorRdfView represents a 500 response in RDF. */

let RdfView = require('../RdfView');

// Creates a new ErrorRdfView
class ErrorRdfView extends RdfView {
  constructor(settings) {
    super('Error', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  _generateRdf(settings, data, metadata, done) {
    this._addDatasources(settings, data, metadata);
    done();
  }
}


module.exports = ErrorRdfView;
