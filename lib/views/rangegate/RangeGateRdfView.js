/*! @license ©2016 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A RangeGateRdfView represents a Range Gate in RDF. */

var TriplePatternFragmentsRdfView = require('../triplepatternfragments/TriplePatternFragmentsRdfView');

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    a   = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    mdi = 'http://example.org/multidimensionalindex#'; // TODO

// Creates a new TriplePatternFragmentsRdfView
function RangeGateRdfView(settings) {
  if (!(this instanceof RangeGateRdfView))
    return new RangeGateRdfView(settings);
  settings = settings || {};
  settings.viewNameOverride = 'RangeGate';
  TriplePatternFragmentsRdfView.call(this, settings);
}
TriplePatternFragmentsRdfView.extend(RangeGateRdfView);

// Generates triples and quads from time ranges by sending them to the data and/or metadata callbacks
RangeGateRdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  TriplePatternFragmentsRdfView.prototype._generateRdf.call(this, settings, function(range) {
    if(range) {
      var rangeGate = range.uri;
      data(rangeGate, a, mdi + "RangeFragment");
      data(rangeGate, mdi + "initial", "\"" + range.initial + "\"");
      data(rangeGate, mdi + "final", "\"" + range.final + "\"");
    } else {
      data();
    }
  }, metadata, done);
};

// Generate the datasource metadata
RangeGateRdfView.prototype.sendDatasourceMetadata = function(metadata, fragment, query, datasource) {
  TriplePatternFragmentsRdfView.prototype.sendDatasourceMetadata(metadata, fragment, query, datasource);
  metadata(datasource.url, rdf + 'type', mdi + 'RangeGate');
};

// Generate the datasource controls
RangeGateRdfView.prototype.sendDatasourceControls = function(metadata, fragment, query, datasource) {
  metadata(datasource.url, hydra + 'search',       '_:range');
  metadata('_:range',     hydra + 'template',      '"' + datasource.templateUrl + '"');
  metadata('_:range',     hydra + 'mapping',       '_:initial');
  metadata('_:range',     hydra + 'mapping',       '_:final');
  metadata('_:initial',   hydra + 'variable',      '"initial"');
  metadata('_:initial',   hydra + 'property', mdi + 'initial');
  metadata('_:final',     hydra + 'variable',      '"final"');
  metadata('_:final',     hydra + 'property', mdi + 'final');
};

module.exports = RangeGateRdfView;
