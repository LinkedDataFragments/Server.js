/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
/* A NotFoundRdfView represents a 404 response in RDF. */

var RdfView = require('../RdfView');

// Creates a new NotFoundRdfView
function NotFoundRdfView(settings) {
  if (!(this instanceof NotFoundRdfView))
    return new NotFoundRdfView(settings);
  RdfView.call(this, 'NotFound', settings);
}
RdfView.extend(NotFoundRdfView);

// Generates triples and quads by sending them to the data and/or metadata callbacks
NotFoundRdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  this._addDatasources(settings, data, metadata);
  done();
};

module.exports = NotFoundRdfView;
