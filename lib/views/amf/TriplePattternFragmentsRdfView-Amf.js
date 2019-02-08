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
  var self = this;
  if (settings.datasource.amf) {
    if (!settings.amf)
      settings.amf = {};
    var filterPath = settings.amf.path ? settings.amf.path.slice(1, settings.amf.path.length - 1) : 'amf',
        requestUrl = url.parse(settings.fragmentUrl),
        filterBaseUri = url.format(_.defaults({ pathname: filterPath + requestUrl.pathname }, requestUrl));

    var variables = _.pick(_.assign({
      subject: '?s',
      predicate: '?s',
      object: '?o',
    }, query), function (v) {
      return typeof v === 'string' && v.indexOf('?') === 0;
    });

    for (var variable in variables) {
      var filterUri = filterBaseUri + '#' + variable;
      metadata(settings.fragmentUrl, amf + 'membershipFilter', filterUri);
      metadata(filterUri, amf + 'variable', rdf + variable);
    }
    // If amf is inband (and has only one variable), construct it and put it inline.
    if (settings.amf.inband) {
      var maxVariables = settings.amf.inband.maxVariables || 2;
      var maxTotalCount = settings.amf.inband.maxTotalCount || 10000;
      settings.results.getProperty('metadata', function (meta) {
        if (!query.offset && (((query.subject ? 1 : 0) + (query.predicate ? 1 : 0) + (query.object ? 1 : 0) === maxVariables) || meta.totalCount < maxTotalCount)) {
          // Create Approximate Membership filters
          self._amf.build(query, function (error, filter) {
            if (filter) {
              for (var variable in filter) {
                var filterUri = filterBaseUri + '#' + variable;
                metadata(filterUri, rdf + 'type', filter[variable].type);
                metadata(filterUri, amf + 'filter', '"' + filter[variable].filter + '"^^' + xsd + 'base64Binary');

                'k' in filter[variable] && metadata(filterUri, amf + 'hashes', '"' + filter[variable].k + '"^^' + xsd + 'integer');
                'm' in filter[variable] && metadata(filterUri, amf + 'bits', '"' + filter[variable].m + '"^^' + xsd + 'integer');
              }
              done();
            }
          });
        }
        else
          done();
      });
    }
    else
      done();
  }
  else
    done();
};

module.exports = AmfRdfViewExtension;
