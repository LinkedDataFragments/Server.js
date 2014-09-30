/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TurtleFragmentWriter represents Linked Data Fragments as Turtle. */

var N3 = require('n3'),
    UriTemplate = require('uritemplate');

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
      datasource = settings.datasource, fragment = settings.fragment, query = settings.query;

  // Add data source metadata
  writeTriple(datasource.url, rdf + 'type', voID  + 'Dataset');
  writeTriple(datasource.url, rdf + 'type', hydra + 'Collection');
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
    var totalCount = metadata.totalCount;
    writeTriple(fragment.url, rdf + 'type', hydra + 'Collection');
    writeTriple(fragment.url, rdf + 'type', hydra + 'PagedCollection');
    writeTriple(fragment.url, dcTerms + 'title',
                '"Linked Data Fragment of ' + datasource.name + '"@en');
    writeTriple(fragment.url, dcTerms + 'description',
                '"Triple Pattern Fragment of the \'' + datasource.name + '\' dataset ' +
                'containing triples matching the pattern ' + query.patternString + '."@en');
    writeTriple(fragment.url, dcTerms + 'source',   datasource.url);
    writeTriple(fragment.url, hydra + 'totalItems', '"' + totalCount + '"^^' + xsd + 'integer');
    writeTriple(fragment.url, voID  + 'triples',    '"' + totalCount + '"^^' + xsd + 'integer');
    writeTriple(fragment.url, hydra + 'itemsPerPage', '"' + query.limit + '"^^' + xsd + 'integer');
  });

  // Add data triples
  tripleStream.on('data', function (triple) { writer.addTriple(triple); });
  tripleStream.on('end', function () { writer.end(); });

  // Writes the triple to the destination, ensuring it is valid
  function writeTriple(s, p, o) {
    if (!N3.Util.isLiteral(s) && !N3.Util.isLiteral(p))
      writer.addTriple(s, p, o);
  }
};

module.exports = TurtleFragmentWriter;
