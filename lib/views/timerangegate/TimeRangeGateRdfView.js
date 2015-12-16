/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A TimeRangeGateRdfView represents a time range in RDF. */

var TriplePatternFragmentsRdfView = require('../triplepatternfragments/TriplePatternFragmentsRdfView');

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    tmp = 'http://example.org/temporal#',
    a   = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    sd = 'http://www.w3.org/TR/sparql11-service-description/#',
    tmp = 'http://example.org/temporal/#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    hydra = 'http://www.w3.org/ns/hydra/core#';

// Creates a new QuadPatternFragmentsRdfView
function TimeRangeGateRdfView(settings) {
  if (!(this instanceof TimeRangeGateRdfView))
    return new TimeRangeGateRdfView(settings);
  settings = settings || {};
  settings.viewNameOverride = 'TimeRangeGate';
  TriplePatternFragmentsRdfView.call(this, settings);
}
TriplePatternFragmentsRdfView.extend(TimeRangeGateRdfView);

// Generates triples and quads from time ranges by sending them to the data and/or metadata callbacks
TimeRangeGateRdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  TriplePatternFragmentsRdfView.prototype._generateRdf(settings, function(timeRange) {
    if(timeRange) {
      var timeRangeDatasource = timeRange.datasourceUrl;
      data(timeRangeDatasource, a, tmp + "Timerange");
      data(timeRangeDatasource, tmp + "initial", timeRange.initial);
      data(timeRangeDatasource, tmp + "final", timeRange.final);
    } else {
      data();
    }
  }, metadata, done);
};

// Generate the datasource metadata
TimeRangeGateRdfView.prototype.sendDatasourceMetadata = function(metadata, fragment, query, datasource) {
  TriplePatternFragmentsRdfView.prototype.sendDatasourceMetadata(metadata, fragment, query, datasource);
  metadata(datasource.index, rdf + 'type', tmp + 'timeRangeGate');
};

// Generate the datasource controls
TimeRangeGateRdfView.prototype.sendDatasourceControls = function(metadata, fragment, query, datasource) {
  metadata(datasource.url, hydra + 'search', '_:timeRange');
  metadata('_:timeRange', hydra + 'template', '"' + datasource.templateUrl + '"');
  metadata('_:timeRange', hydra + 'mapping', '_:initial');
  metadata('_:timeRange', hydra + 'mapping', '_:final');
  metadata('_:initial',   hydra + 'variable',      '"initial"');
  metadata('_:initial',   hydra + 'property', tmp + 'initial');
  metadata('_:final',     hydra + 'variable',      '"final"');
  metadata('_:final',     hydra + 'property', tmp + 'final');
};

module.exports = TimeRangeGateRdfView;
