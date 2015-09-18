/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A NotFoundRdfView represents a 404 response in RDF. */

var RdfView = require('../RdfView');

var dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new NotFoundRdfView
function NotFoundRdfView(settings) {
  if (!(this instanceof NotFoundRdfView))
    return new NotFoundRdfView(settings);
  RdfView.call(this, 'NotFound', settings);
}
RdfView.extend(NotFoundRdfView);

// Generates triples and quads by sending them to the data and/or metadata callbacks
NotFoundRdfView.prototype._generateRdf = function (settings, data, metadata) {
  var datasources = settings.datasources;
  for (var datasourceName in datasources) {
    var datasource = datasources[datasourceName];
    metadata(datasource.url, rdf + 'type', voID  + 'Dataset');
    metadata(datasource.url, rdf + 'type', hydra + 'Collection');
    metadata(datasource.url, dcTerms + 'title', '"' + datasource.title + '"');
  }
};

module.exports = NotFoundRdfView;
