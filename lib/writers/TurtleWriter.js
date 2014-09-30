/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TurtleFragmentWriter represents Linked Data Fragments as Turtle. */

var N3 = require('n3'),
    url = require('url');

var dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new TurtleFragmentWriter
function TurtleFragmentWriter() {
  if (!(this instanceof TurtleFragmentWriter))
    return new TurtleFragmentWriter();
}

// Writes the stream of triples to the destination as a Linked Data Fragment
TurtleFragmentWriter.prototype.writeFragment = function (destination, tripleStream, settings) {
  settings = settings || {};
  var writer = new N3.Writer(destination, settings.prefixes),
      datasource = settings.datasource, fragment = settings.fragment, query = settings.query,
      metadataWritten = false, triplesWritten = false;

  // Add data source metadata
  writeTriple(datasource.url, rdf + 'type', voID  + 'Dataset');
  writeTriple(datasource.url, rdf + 'type', hydra + 'Collection');
  writeTriple(datasource.url, voID + 'subset', fragment.pageUrl);
  writeTriple(datasource.url, voID + 'subset', fragment.url);
  writeTriple(datasource.url, voID + 'uriLookupEndpoint', '"' + datasource.templateUrl + '"');

  // Add data source controls
  writeTriple(datasource.url, hydra + 'search', '_:triplePattern');
  writeTriple('_:triplePattern', hydra + 'template', '"' + datasource.templateUrl + '"');
  writeTriple('_:triplePattern', hydra + 'mapping', '_:subject');
  writeTriple('_:triplePattern', hydra + 'mapping', '_:predicate');
  writeTriple('_:triplePattern', hydra + 'mapping', '_:object');
  writeTriple('_:subject',   hydra + 'variable',      '"subject"');
  writeTriple('_:subject',   hydra + 'property', rdf + 'subject');
  writeTriple('_:predicate', hydra + 'variable',      '"predicate"');
  writeTriple('_:predicate', hydra + 'property', rdf + 'predicate');
  writeTriple('_:object',    hydra + 'variable',      '"object"');
  writeTriple('_:object',    hydra + 'property', rdf + 'object');

  // Add fragment metadata
  tripleStream.on('metadata', function (metadata) {
    // Write general fragment metadata
    writeTriple(fragment.url, voID + 'subset', fragment.pageUrl);
    writeTriple(fragment.pageUrl, rdf + 'type', hydra + 'Collection');
    writeTriple(fragment.pageUrl, rdf + 'type', hydra + 'PagedCollection');
    writeTriple(fragment.pageUrl, dcTerms + 'title',
                '"Linked Data Fragment of ' + datasource.name + '"@en');
    writeTriple(fragment.pageUrl, dcTerms + 'description',
                '"Triple Pattern Fragment of the \'' + datasource.name + '\' dataset ' +
                'containing triples matching the pattern ' + query.patternString + '."@en');
    writeTriple(fragment.pageUrl, dcTerms + 'source',   datasource.url);

    // Write total pattern count
    var totalCount = metadata.totalCount;
    writeTriple(fragment.pageUrl, hydra + 'totalItems', '"' + totalCount + '"^^' + xsd + 'integer');
    writeTriple(fragment.pageUrl, voID  + 'triples',    '"' + totalCount + '"^^' + xsd + 'integer');

    // Write page metadata
    writeTriple(fragment.pageUrl, hydra + 'itemsPerPage', '"' + query.limit + '"^^' + xsd + 'integer');
    writeTriple(fragment.pageUrl, hydra + 'firstPage',    fragment.firstPageUrl);
    writeTriple(fragment.pageUrl, hydra + 'previousPage', fragment.prevousPageUrl);
    writeTriple(fragment.pageUrl, hydra + 'nextPage',     fragment.nextPageUrl);

    // End the writer if all triples have been written
    metadataWritten = true;
    triplesWritten && writer.end();
  });

  // Add data triples
  tripleStream.on('data', function (triple) { writer.addTriple(triple); });
  tripleStream.on('end',  function () { triplesWritten = true; metadataWritten && writer.end(); });

  // Writes the triple to the destination, ensuring it is valid
  function writeTriple(s, p, o) {
    if (s && p && o && !N3.Util.isLiteral(s) && !N3.Util.isLiteral(p))
      writer.addTriple(s, p, o);
  }
};

module.exports = TurtleFragmentWriter;
