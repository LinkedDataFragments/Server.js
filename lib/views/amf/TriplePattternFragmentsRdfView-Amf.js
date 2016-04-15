/*! @license ©2015 Miel Vander Sande - Multimedia Lab / iMinds / Ghent University */

/** A AmfRdfViewExtension extends the Triple Pattern Fragments RDF view with a Amf link. */

var RdfView = require('../RdfView'),
    url = require('url'),
    _ = require('lodash'),
    AmfBuilder = require('../../amf/AmfBuilder');

var amf = 'http://semweb.mmlab.be/ns/membership#',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    xsd = 'http://www.w3.org/2001/XMLSchema#';

// Creates a new AmfRdfViewExtension
function AmfRdfViewExtension(settings) {
  if (!(this instanceof AmfRdfViewExtension))
    return new AmfRdfViewExtension(settings);
  RdfView.call(this, 'TriplePatternFragments:After', settings);
  this._amf = new AmfBuilder(settings);
}
RdfView.extend(AmfRdfViewExtension);

// Generates triples and quads by sending them to the data and/or metadata callbacks
AmfRdfViewExtension.prototype._generateRdf = function (settings, data, metadata, done) {
  // If amfs are enabled, connect the fragment to its Amf
  var query = settings.query;
  if (settings.datasource.amf) {
    var filterPath = settings.amf.path ? settings.amf.path.slice(1, settings.amf.path.length - 1) : 'amf',
        requestUrl = url.parse(settings.fragmentUrl);

    metadata(settings.fragmentUrl, amf + 'membershipFilter', url.format(_.defaults({ pathname:  filterPath + requestUrl.pathname }, requestUrl)));
    // If amf is inband (and has only one variable), construct it and put it inline.
    if (settings.amf.inband && (((query.subject ? 1 : 0) + (query.predicate ? 1 : 0) + (query.object ? 1 : 0) === 2) || metadata.totalItems < 10000)) {
      // Create Approximate Membership filters
      this._amf.build(query, function (error, filter) {
        if (filter) {
          for (var variable in filter) {
            metadata(settings.fragmentUrl, amf + 'membershipFilter', '_:amf_' + variable);

            metadata('_:amf_' + variable, rdf + 'type', filter[variable].type);
            metadata('_:amf_' + variable, amf + 'filter', '"' + filter[variable].filter + '"^^' + xsd + 'base64Binary');
            metadata('_:amf_' + variable, amf + 'variable', rdf + variable);

            filter[variable].k && metadata('_:amf_' + variable, amf + 'hashes', '"' + filter[variable].k + '"^^' + xsd + 'integer');
            filter[variable].m && metadata('_:amf_' + variable, amf + 'bits', '"' + filter[variable].m + '"^^' + xsd + 'integer');
          }
          done();
        }
      });
    } else
      done();
  } else
    done();
};

module.exports = AmfRdfViewExtension;
