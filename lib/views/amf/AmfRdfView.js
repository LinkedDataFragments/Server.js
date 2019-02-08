/*! @license ©2015 Miel Vander Sande - Multimedia Lab / iMinds / Ghent University */

/** A AmfRdfView represents an Amf in RDF. */

var RdfView = require('../RdfView');

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    amf = 'http://semweb.mmlab.be/ns/membership#';

// Creates a new AmfRdfView
function AmfRdfView(settings) {
  if (!(this instanceof AmfRdfView))
    return new AmfRdfView(settings);
  RdfView.call(this, 'Amf', settings);
}
RdfView.extend(AmfRdfView);

// Generates triples and quads by sending them to the data and/or metadata callbacks
AmfRdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  var filter = settings.filter;
  // Add Amf triples
  for (var variable in filter) {
    var filterUri = settings.baseUri + '#' + variable;
    metadata(filterUri, rdf + 'type', filter[variable].type);
    metadata(filterUri, amf + 'filter', '"' + filter[variable].filter + '"^^' + xsd + 'base64Binary');
    metadata(filterUri, amf + 'variable', rdf + variable);

    'k' in filter[variable] && metadata(filterUri, amf + 'hashes', '"' + filter[variable].k + '"^^' + xsd + 'integer');
    'm' in filter[variable] && metadata(filterUri, amf + 'bits', '"' + filter[variable].m + '"^^' + xsd + 'integer');
  }
  done();
};

module.exports = AmfRdfView;
