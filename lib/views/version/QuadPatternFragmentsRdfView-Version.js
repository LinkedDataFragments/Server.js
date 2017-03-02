/*! @license MIT ©2017 Ruben Taelman, Ghent University - imec */
/** A VersionRdfViewExtension extends the Quad Pattern Fragments RDF view with versioning controls. */

var RdfView = require('../RdfView');

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    sd = 'http://www.w3.org/TR/sparql11-service-description/#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    ver = 'http://example.org/version#';

// Creates a new VersionRdfViewExtension
function VersionRdfViewExtension(settings) {
  if (!(this instanceof VersionRdfViewExtension))
    return new VersionRdfViewExtension(settings);
  RdfView.call(this, 'QuadPatternFragments:After', settings);
}
RdfView.extend(VersionRdfViewExtension);

// Renders the view with the given settings to the response
VersionRdfViewExtension.prototype._generateRdf = function (settings, request, metadata, done) {
  var datasource = settings.datasource, metadataDone = 0;
  if (settings.datasource.supportsVersioning) {
    settings.results.getProperty('metadata', function (meta) {
      Object.keys(meta.versionGraphs).forEach(function (graphName) {
        var data = meta.versionGraphs[graphName];
        for (var i = 0; i < data.versions.length; i++) {
          metadata(
            '_:versionGraph' + data.id,
            'http://example.org/version#forVersion',
            '\"' + data.versions[i] + '\"'
          );
        }
      });
      // End if both the metadata and the data have been written
      metadataDone++ && done();
    });

    // Version Materialized
    var versionMaterializedNode = this._generateRdfControlBase(metadata, datasource, 'VersionMaterialized', '{?subject,predicate,object,graph,version}');
    metadata(versionMaterializedNode, hydra + 'mapping', '_:version');
    metadata('_:version', hydra + 'variable',       '"version"');
    metadata('_:version', hydra + 'property', ver + 'version');

    // Delta Materialized
    var deltaMaterializedNode = this._generateRdfControlBase(metadata, datasource, 'DeltaMaterialized', '{?subject,predicate,object,graph,versionStart,versionEnd}');
    metadata(deltaMaterializedNode, hydra + 'mapping', '_:versionStart');
    metadata(deltaMaterializedNode, hydra + 'mapping', '_:versionEnd');
    metadata('_:versionStart', hydra + 'variable',       '"versionStart"');
    metadata('_:versionStart', hydra + 'property', ver + 'versionStart');
    metadata('_:versionEnd', hydra + 'versionEnd',       '"versionEnd"');
    metadata('_:versionEnd', hydra + 'versionEnd', ver + 'versionEnd');

    // Version Materialized
    this._generateRdfControlBase(metadata, datasource, 'Version', '{?subject,predicate,object,graph}');
  }
  else metadataDone++;
  metadataDone++ && done();
};

VersionRdfViewExtension.prototype._generateRdfControlBase = function (metadata, datasource, versionType, templateSuffix) {
  var patternBlankNode = '_:pattern' + versionType;
  metadata(datasource.url, hydra + 'search', patternBlankNode);
  var template = datasource.datasourceUrl + templateSuffix;
  metadata(patternBlankNode, hydra + 'template', '"' + template + '"');
  metadata(patternBlankNode, hydra + 'variableRepresentation', hydra + 'ExplicitRepresentation');
  metadata(patternBlankNode, hydra + 'mapping', '_:subject');
  metadata(patternBlankNode, hydra + 'mapping', '_:predicate');
  metadata(patternBlankNode, hydra + 'mapping', '_:object');
  metadata(patternBlankNode, hydra + 'mapping', '_:graph');
  metadata('_:subject',   hydra + 'variable',      '"subject"');
  metadata('_:subject',   hydra + 'property', rdf + 'subject');
  metadata('_:predicate', hydra + 'variable',      '"predicate"');
  metadata('_:predicate', hydra + 'property', rdf + 'predicate');
  metadata('_:object',    hydra + 'variable',      '"object"');
  metadata('_:object',    hydra + 'property', rdf + 'object');
  metadata('_:graph',   hydra + 'variable',      '"graph"');
  metadata('_:graph',   hydra + 'property', sd  + 'graph');
  return patternBlankNode;
};

module.exports = VersionRdfViewExtension;
