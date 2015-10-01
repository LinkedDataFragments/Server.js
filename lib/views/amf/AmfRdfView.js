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
    data('_:amf_' + variable, rdf + 'type', filter[variable].type);
    data('_:amf_' + variable, amf + 'filter', '"' + filter[variable].filter + '"^^' + xsd + 'base64Binary');
    data('_:amf_' + variable, amf + 'variable', rdf + variable);

    filter[variable].k && data('_:amf_' + variable, amf + 'hashes', '"' + filter[variable].k + '"^^' + xsd + 'integer');
    filter[variable].m && data('_:amf_' + variable, amf + 'bits', '"' + filter[variable].m + '"^^' + xsd + 'integer');
  }
  done();
};

module.exports = AmfRdfView;
