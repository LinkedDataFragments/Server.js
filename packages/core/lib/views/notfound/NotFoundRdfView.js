/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A NotFoundRdfView represents a 404 response in RDF. */

let RdfView = require('../RdfView');

// Creates a new NotFoundRdfView
class NotFoundRdfView extends RdfView {
  constructor(settings) {
    super('NotFound', settings);
  }

  // Generates triples and quads by sending them to the data and/or metadata callbacks
  _generateRdf(settings, data, metadata, done) {
    this._addDatasources(settings, data, metadata);
    done();
  }
}


module.exports = NotFoundRdfView;
