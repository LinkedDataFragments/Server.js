/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A TimeRangeGateRdfView represents a time range in RDF. */

var TriplePatternFragmentsRdfView = require('../triplepatternfragments/TriplePatternFragmentsRdfView');

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    tmp = 'http://example.org/temporal#',
    a   = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    sd = 'http://www.w3.org/TR/sparql11-service-description/#',
    tmp = 'http://example.org/temporal/#',
    mdi = 'http://example.org/multidimensionalindex#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    voID = 'http://rdfs.org/ns/void#'
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
  TriplePatternFragmentsRdfView.prototype._generateRdf.call(this, settings, function(timeRange) {
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
  TriplePatternFragmentsRdfView.prototype.sendDatasourceMetadata.call(this, metadata, fragment, query, datasource);
  metadata(datasource.index, rdf + 'type', tmp + 'timeRangeGate');
};

// Generate the fragment metadata
TimeRangeGateRdfView.prototype.sendFragmentMetadata = function(metadata, fragment, query, datasource, meta) {
  TriplePatternFragmentsRdfView.prototype.sendFragmentMetadata.call(this, metadata, fragment, query, datasource, meta);
  // TODO: copy-pasted from QPFRDFView-Temp
  metadata(datasource.url, mdi + 'hasMultidimensionalIndex', meta.timeRangeGate);
  var template = "\"" + meta.timeRangeGate + "{?initial,final}" + "\"";
  metadata(meta.timeRangeGate, voID + 'uriLookupEndpoint', template);
  var trgPattern = "_:trgPattern";
  metadata(meta.timeRangeGate, hydra + 'search', trgPattern);
  metadata(trgPattern, hydra + 'template', template);
  var initial = "_:initial";
  var final = "_:final";
  metadata(trgPattern, hydra + 'mapping', initial);
  metadata(trgPattern, hydra + 'mapping', final);
  metadata(initial, hydra + 'variable', "\"initial\"");
  metadata(initial, hydra + 'property', tmp + "initial");
  metadata(final, hydra + 'variable', "\"final\"");
  metadata(final, hydra + 'property', tmp + "final");

};

module.exports = TimeRangeGateRdfView;
