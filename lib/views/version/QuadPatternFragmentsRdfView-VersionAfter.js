/*! @license MIT ©2017 Ruben Taelman, Ghent University - imec */
/** A VersionRdfViewExtension extends the Quad Pattern Fragments RDF view with versioning controls. */

var RdfView = require('../RdfView');

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    ver = 'http://semweb.mmlab.be/ns/version#';

// Creates a new VersionRdfViewExtension
function VersionRdfViewExtension(settings) {
  if (!(this instanceof VersionRdfViewExtension))
    return new VersionRdfViewExtension(settings);
  RdfView.call(this, 'QuadPatternFragments:After', settings);
}
RdfView.extend(VersionRdfViewExtension);

// Renders the view with the given settings to the response
VersionRdfViewExtension.prototype._generateRdf = function (settings, request, metadata, done) {
  var datasource = settings.datasource, fragment = settings.fragment, metadataDone = 0;
  if (settings.datasource.supportsVersioning) {
    settings.results.getProperty('metadata', function (meta) {
      if (settings.query.versionType === 'VersionMaterialized') {
        // Add metadata about the version materialized query result
        var version = settings.query.version;
        if (!version && version !== 0)
          version = meta.maxVersion;
        metadata(fragment.pageUrl, ver + 'relatedVersion', versionToUri(version));
        metadata(fragment.pageUrl, ver + 'versionCount', '\"' + meta.maxVersion + '\"^^xsd:integer');
        addVersionMetadata(fragment.pageUrl, version, meta);
      }
      else if (settings.query.versionType === 'DeltaMaterialized') {
        // Add metadata about the addition and deletion changesets
        var versionEnd = settings.query.versionEnd;
        if (versionEnd === -1)
          versionEnd = meta.maxVersion;
        var additions = '_:changeSetAdditions';
        var deletions = '_:changeSetDeletions';
        metadata(additions, rdf + 'type',           ver + 'ChangeSetAdditions');
        metadata(additions, ver + 'changeSetStart', versionToUri(settings.query.versionStart));
        metadata(additions, ver + 'changeSetEnd',   versionToUri(versionEnd));
        metadata(deletions, rdf + 'type',           ver + 'ChangeSetDeletions');
        metadata(deletions, ver + 'changeSetStart', versionToUri(settings.query.versionStart));
        metadata(deletions, ver + 'changeSetEnd',   versionToUri(versionEnd));
        addVersionMetadata(versionToUri(settings.query.versionStart), settings.query.versionStart, meta);
        addVersionMetadata(versionToUri(versionEnd), versionEnd, meta);
      }
      else if (settings.query.versionType === 'Version') {
        // Add metadata about the versionsets
        Object.keys(meta.versionGraphs).forEach(function (graphName) {
          var data = meta.versionGraphs[graphName];
          metadata('_:versionGraph' + data.id, rdf + 'type', ver + 'VersionSet');
          for (var i = 0; i < data.versions.length; i++) {
            metadata(
              '_:versionGraph' + data.id,
              ver + 'versionSetContains',
              versionToUri(data.versions[i])
            );
            addVersionMetadata(versionToUri(data.versions[i]), data.versions[i], meta);
          }
        });
      }
      // End if both the metadata and the data have been written
      metadataDone++ && done();
    });

    // Version Materialized
    var versionMaterializedNode = this._generateRdfControlBase(metadata, datasource, 'VersionMaterialized', '?versionType=VersionMaterialized{&subject,predicate,object,version}');
    metadata(versionMaterializedNode, hydra + 'mapping', '_:version');
    metadata('_:version', hydra + 'variable',       '"version"');
    metadata('_:version', hydra + 'property', ver + 'relatedVersion');

    // Delta Materialized
    var deltaMaterializedNode = this._generateRdfControlBase(metadata, datasource, 'DeltaMaterialized', '?versionType=DeltaMaterialized{&subject,predicate,object,changeSetStart,changeSetEnd}');
    metadata(deltaMaterializedNode, hydra + 'mapping', '_:changeSetStart');
    metadata(deltaMaterializedNode, hydra + 'mapping', '_:changeSetEnd');
    metadata('_:changeSetStart', hydra + 'variable',       '"changeSetStart"');
    metadata('_:changeSetStart', hydra + 'property', ver + 'changeSetStart');
    metadata('_:changeSetEnd', hydra + 'versionEnd',       '"changeSetEnd"');
    metadata('_:changeSetEnd', hydra + 'versionEnd', ver + 'changeSetEnd');

    // Version Materialized
    this._generateRdfControlBase(metadata, datasource, 'Version', '&versionType=Version{&subject,predicate,object,graph}');
  }
  else metadataDone++;
  metadataDone++ && done();

  function versionToUri(version) {
    return datasource.datasourceUrl + '?versionType=VersionMaterialized&version=' + version;
  }

  function addVersionMetadata(versionUri, version, meta) {
    metadata(versionUri, rdf + 'type', ver  + 'Version');
    if (version < meta.maxVersion)
      metadata(versionUri, ver + 'beforeVersion', versionToUri(version + 1));
    if (version > 0)
      metadata(versionUri, ver + 'afterVersion', versionToUri(version - 1));
    metadata(versionUri, ver + 'firstVersion', versionToUri(0));
    metadata(versionUri, ver + 'latestVersion', versionToUri(meta.maxVersion));
  }
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
  metadata('_:subject',   hydra + 'variable',      '"subject"');
  metadata('_:subject',   hydra + 'property', rdf + 'subject');
  metadata('_:predicate', hydra + 'variable',      '"predicate"');
  metadata('_:predicate', hydra + 'property', rdf + 'predicate');
  metadata('_:object',    hydra + 'variable',      '"object"');
  metadata('_:object',    hydra + 'property', rdf + 'object');
  return patternBlankNode;
};

module.exports = VersionRdfViewExtension;
