/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TurtleWriter represents Linked Data Fragments as Turtle. */

var N3 = require('n3'),
    url = require('url');

var dcTerms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new TurtleWriter
function TurtleWriter() {
  if (!(this instanceof TurtleWriter))
    return new TurtleWriter();
}

// Writes the stream of triples to the destination as a Linked Data Fragment
TurtleWriter.prototype.writeFragment = function (destination, tripleStream, settings) {
  settings = settings || {};
  var writer = this._createWriter(destination, settings),
      metadataWritten = false, triplesWritten = false,
      datasource = settings.datasource, fragment = settings.fragment, query = settings.query;

  // Add data source metadata
  writer.meta(datasource.index, hydra + 'member', datasource.url);
  writer.meta(datasource.url, rdf + 'type', voID  + 'Dataset');
  writer.meta(datasource.url, rdf + 'type', hydra + 'Collection');
  writer.meta(datasource.url, voID + 'subset', fragment.pageUrl);
  if (fragment.url !== fragment.pageUrl)
    writer.meta(datasource.url, voID + 'subset', fragment.url);
  writer.meta(datasource.url, voID + 'uriLookupEndpoint', '"' + datasource.templateUrl + '"');

  // Add data source controls
  writer.meta(datasource.url, hydra + 'search', '_:triplePattern');
  writer.meta('_:triplePattern', hydra + 'template', '"' + datasource.templateUrl + '"');
  writer.meta('_:triplePattern', hydra + 'mapping', '_:subject');
  writer.meta('_:triplePattern', hydra + 'mapping', '_:predicate');
  writer.meta('_:triplePattern', hydra + 'mapping', '_:object');
  writer.meta('_:subject',   hydra + 'variable',      '"subject"');
  writer.meta('_:subject',   hydra + 'property', rdf + 'subject');
  writer.meta('_:predicate', hydra + 'variable',      '"predicate"');
  writer.meta('_:predicate', hydra + 'property', rdf + 'predicate');
  writer.meta('_:object',    hydra + 'variable',      '"object"');
  writer.meta('_:object',    hydra + 'property', rdf + 'object');

  // Add fragment metadata
  tripleStream.on('metadata', function (metadata) {
    // Write general fragment metadata
    writer.meta(fragment.url, voID + 'subset', fragment.pageUrl);
    writer.meta(fragment.pageUrl, rdf + 'type', hydra + 'Collection');
    writer.meta(fragment.pageUrl, rdf + 'type', hydra + 'PagedCollection');
    writer.meta(fragment.pageUrl, dcTerms + 'title',
                '"Linked Data Fragment of ' + (datasource.title || '') + '"@en');
    writer.meta(fragment.pageUrl, dcTerms + 'description',
                '"Triple Pattern Fragment of the \'' + (datasource.title || '') + '\' dataset ' +
                'containing triples matching the pattern ' + query.patternString + '."@en');
    writer.meta(fragment.pageUrl, dcTerms + 'source',   datasource.url);

    // Write total pattern count
    var totalCount = metadata.totalCount;
    writer.meta(fragment.pageUrl, hydra + 'totalItems', '"' + totalCount + '"^^' + xsd + 'integer');
    writer.meta(fragment.pageUrl, voID  + 'triples',    '"' + totalCount + '"^^' + xsd + 'integer');

    // Write page metadata
    writer.meta(fragment.pageUrl, hydra + 'itemsPerPage', '"' + query.limit + '"^^' + xsd + 'integer');
    writer.meta(fragment.pageUrl, hydra + 'firstPage',    fragment.firstPageUrl);
    if (query.offset)
      writer.meta(fragment.pageUrl, hydra + 'previousPage', fragment.previousPageUrl);
    if (totalCount >= query.limit + (query.offset || 0))
      writer.meta(fragment.pageUrl, hydra + 'nextPage',     fragment.nextPageUrl);

    // End the writer if all triples have been written
    metadataWritten = true;
    triplesWritten && writer.end();
  });

  // Add data triples
  tripleStream.on('data', function (t) { writer.data(t.subject, t.predicate, t.object); });
  tripleStream.on('end',  function ()  { triplesWritten = true; metadataWritten && writer.end(); });
};

// Writes a 'not found' response
TurtleWriter.prototype.writeNotFound = function (destination, settings) {
  var writer = this._createWriter(destination, settings);
  for (var datasourceName in settings.datasources) {
    var datasource = settings.datasources[datasourceName];
    writer.data(datasource.url, rdf + 'type', voID  + 'Dataset');
    writer.data(datasource.url, rdf + 'type', hydra + 'Collection');
    writer.data(datasource.url, dcTerms + 'title', '"' + datasource.title + '"');
  }
  writer.end();
};

// Writes an error response
TurtleWriter.prototype.writeError = function (destination, error, settings) {
  this.writeNotFound(destination, settings);
};

// Creates a writer that serializes triples to Turtle
TurtleWriter.prototype._createWriter = function (destination, settings) {
  var writer = new N3.Writer({ format: this._format, prefixes: settings.prefixes });
  return {
    // Adds the data triple to the output
    data: function (s, p, o) {
      writer.addTriple(s, p, o);
    },
    // Adds the metadata triple to the output
    meta: function (s, p, o) {
      if (s && p && o && !N3.Util.isLiteral(s))
        writer.addTriple(s, p, o);
    },
    // Ends the output and flushes the stream
    end: function () {
      writer.end(function (error, output) { destination.end(output); });
    },
  };
};

// An identifier for the serialized format
TurtleWriter.prototype._format = 'application/trig';

module.exports = TurtleWriter;
