/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A TemporalRdfViewExtension extends the Triple Pattern Fragments RDF view with a timerange gate link. */

var RdfView = require('../RdfView');

var tmp = 'http://example.org/temporal#',
    mdi = 'http://example.org/multidimensionalindex#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new TemporalRdfViewExtension
function TemporalRdfViewExtension(settings) {
  if (!(this instanceof TemporalRdfViewExtension))
    return new TemporalRdfViewExtension(settings);
  RdfView.call(this, 'QuadPatternFragments:After', settings);
}
RdfView.extend(TemporalRdfViewExtension);

// Renders the view with the given settings to the response
TemporalRdfViewExtension.prototype._generateRdf = function (settings, request, response, done) {
  if(settings.metadata.timeRangeGate) {
    response(settings.datasource.url, mdi + 'hasMultidimensionalIndex', settings.metadata.timeRangeGate);
    var template = "\"" + settings.metadata.timeRangeGate + "{?initial,final}" + "\"";
    response(settings.metadata.timeRangeGate, voID + 'uriLookupEndpoint', template);
    var trgPattern = "_:trgPattern";
    response(settings.metadata.timeRangeGate, hydra + 'search', trgPattern);
    response(trgPattern, hydra + 'template', template);
    var initial = "_:initial";
    var final = "_:final";
    response(trgPattern, hydra + 'mapping', initial);
    response(trgPattern, hydra + 'mapping', final);
    response(initial, hydra + 'variable', "\"initial\"");
    response(initial, hydra + 'property', tmp + "initial");
    response(final, hydra + 'variable', "\"final\"");
    response(final, hydra + 'property', tmp + "final");
  }
  // No need to add these again as metadata, they are (for now) assumed to be just data which makes them more easily browsable using TPF.
  /*if(settings.metadata.timeRanges) {
    for(var timeRange in settings.metadata.timeRanges) {
      var t = settings.metadata.timeRanges[timeRange];
      response(t.subject, t.predicate, t.object);
    }
  }*/
  done();
};

module.exports = TemporalRdfViewExtension;
