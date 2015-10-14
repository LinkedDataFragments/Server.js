/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A QuadPatternFragmentsRdfView represents a Quad Pattern Fragment in RDF. */

var TriplePatternFragmentsRdfView = require('../triplepatternfragments/TriplePatternFragmentsRdfView');

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    sd = 'http://www.w3.org/TR/sparql11-service-description/#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    hydra = 'http://www.w3.org/ns/hydra/core#';

// Creates a new QuadPatternFragmentsRdfView
function QuadPatternFragmentsRdfView(settings) {
  if (!(this instanceof QuadPatternFragmentsRdfView))
    return new QuadPatternFragmentsRdfView(settings);
  TriplePatternFragmentsRdfView.call(this, settings, 'QuadPatternFragments');
}
TriplePatternFragmentsRdfView.extend(QuadPatternFragmentsRdfView);

// Generate the datasource metadata
QuadPatternFragmentsRdfView.prototype.sendDatasourceMetadata = function(metadata, fragment, query, datasource) {
  TriplePatternFragmentsRdfView.prototype.sendDatasourceMetadata(metadata, fragment, query, datasource);
  metadata(datasource.index, sd + 'defaultGraph', datasource.settings.defaultGraph);
};

// Generate the datasource controls
QuadPatternFragmentsRdfView.prototype.sendDatasourceControls = function(metadata, fragment, query, datasource) {
  metadata(datasource.url, hydra + 'search', '_:quadPattern');
  metadata('_:quadPattern', hydra + 'template', '"' + datasource.templateUrl + '"');
  metadata('_:quadPattern', hydra + 'mapping', '_:subject');
  metadata('_:quadPattern', hydra + 'mapping', '_:predicate');
  metadata('_:quadPattern', hydra + 'mapping', '_:object');
  metadata('_:quadPattern', hydra + 'mapping', '_:graph');
  metadata('_:subject',   hydra + 'variable',      '"subject"');
  metadata('_:subject',   hydra + 'property', rdf + 'subject');
  metadata('_:predicate', hydra + 'variable',      '"predicate"');
  metadata('_:predicate', hydra + 'property', rdf + 'predicate');
  metadata('_:object',    hydra + 'variable',      '"object"');
  metadata('_:object',    hydra + 'property', rdf + 'object');
  metadata('_:graph',     hydra + 'variable',      '"graph"');
  metadata('_:graph',     hydra + 'property', sd  + 'graph');
};

module.exports = QuadPatternFragmentsRdfView;
