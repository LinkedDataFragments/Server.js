/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A QuadPatternFragmentsRdfView represents a Quad Pattern Fragment in RDF. */

var RdfView = require('../RdfView');

var dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    sd = 'http://www.w3.org/ns/sparql-service-description#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new QuadPatternFragmentsRdfView
function QuadPatternFragmentsRdfView(settings) {
  if (!(this instanceof QuadPatternFragmentsRdfView))
    return new QuadPatternFragmentsRdfView(settings);
  RdfView.call(this, (settings || {}).viewNameOverride || 'QuadPatternFragments', settings);
}
RdfView.extend(QuadPatternFragmentsRdfView);

// Generates quads by sending them to the data and/or metadata callbacks
QuadPatternFragmentsRdfView.prototype._generateRdf = function (settings, data, metadata, done) {
  var datasource = settings.datasource, fragment = settings.fragment, query = settings.query,
      results = settings.results, self = this, metadataDone = false;

  // Add data source metadata
  this._generateMetadata(metadata, fragment, query, datasource);

  // Add data source controls
  this._generateControls(metadata, fragment, query, datasource);

  // Add fragment metadata
  results.getProperty('metadata', function (meta) {
    self.sendFragmentMetadata(metadata, fragment, query, datasource, meta);

    // End if both the metadata and the data have been written
    metadataDone = true;
    results.ended && done();
  });

  // Add data quads
  results.on('data', data);
  results.on('end',  function ()  {
    // End if both the metadata and the data have been written
    metadataDone && done();
  });
};

// Generate the datasource metadata
QuadPatternFragmentsRdfView.prototype._generateMetadata = function (metadata, fragment, query, datasource) {
  metadata(datasource.index, hydra + 'member', datasource.url);
  metadata(datasource.url, rdf + 'type', voID  + 'Dataset');
  metadata(datasource.url, rdf + 'type', hydra + 'Collection');
  metadata(datasource.url, voID + 'subset', fragment.pageUrl);
  if (fragment.url !== fragment.pageUrl)
    metadata(datasource.url, voID + 'subset', fragment.url);
  metadata(datasource.url, voID + 'uriLookupEndpoint', '"' + datasource.templateUrl + '"');
};

// Generate the datasource controls
QuadPatternFragmentsRdfView.prototype._generateControls = function (metadata, fragment, query, datasource) {
  if (datasource.supportsQuads)
    metadata(datasource.url, sd + 'defaultGraph', 'urn:ldf:defaultGraph');
  metadata(datasource.url, hydra + 'search', '_:pattern');
  metadata('_:pattern', hydra + 'template', '"' + datasource.templateUrl + '"');
  metadata('_:pattern', hydra + 'variableRepresentation', hydra + 'ExplicitRepresentation');
  metadata('_:pattern', hydra + 'mapping', '_:subject');
  metadata('_:pattern', hydra + 'mapping', '_:predicate');
  metadata('_:pattern', hydra + 'mapping', '_:object');
  if (datasource.supportsQuads)
    metadata('_:pattern', hydra + 'mapping', '_:graph');
  metadata('_:subject',   hydra + 'variable',      '"subject"');
  metadata('_:subject',   hydra + 'property', rdf + 'subject');
  metadata('_:predicate', hydra + 'variable',      '"predicate"');
  metadata('_:predicate', hydra + 'property', rdf + 'predicate');
  metadata('_:object',    hydra + 'variable',      '"object"');
  metadata('_:object',    hydra + 'property', rdf + 'object');
  if (datasource.supportsQuads) {
    metadata('_:graph',   hydra + 'variable',      '"graph"');
    metadata('_:graph',   hydra + 'property', sd  + 'graph');
  }
};

// Generate the fragment metadata
QuadPatternFragmentsRdfView.prototype.sendFragmentMetadata = function (metadata, fragment, query, datasource, meta) {
  // General fragment metadata
  metadata(fragment.url, voID + 'subset', fragment.pageUrl);
  metadata(fragment.pageUrl, rdf + 'type', hydra + 'PartialCollectionView');
  metadata(fragment.pageUrl, dcTerms + 'title',
    '"Linked Data Fragment of ' + (datasource.title || '') + '"@en');
  metadata(fragment.pageUrl, dcTerms + 'description',
    '"Triple/Quad Pattern Fragment of the \'' + (datasource.title || '') + '\' dataset ' +
    'containing triples matching the pattern ' + query.patternString + '."@en');
  metadata(fragment.pageUrl, dcTerms + 'source',   datasource.url);

  // Total pattern matches count
  var totalCount = meta.totalCount;
  metadata(fragment.pageUrl, hydra + 'totalItems', '"' + totalCount + '"^^' + xsd + 'integer');
  metadata(fragment.pageUrl, voID  + 'triples',    '"' + totalCount + '"^^' + xsd + 'integer');

  // Page metadata
  metadata(fragment.pageUrl, hydra + 'itemsPerPage', '"' + query.limit + '"^^' + xsd + 'integer');
  metadata(fragment.pageUrl, hydra + 'first', fragment.firstPageUrl);
  if (query.offset)
    metadata(fragment.pageUrl, hydra + 'previous', fragment.previousPageUrl);
  if (totalCount >= query.limit + (query.offset || 0))
    metadata(fragment.pageUrl, hydra + 'next', fragment.nextPageUrl);
};

module.exports = QuadPatternFragmentsRdfView;
