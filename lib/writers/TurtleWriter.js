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

// Writes an error response
TurtleWriter.prototype.writeError = function (destination, error, settings) {
  var writer = this._createWriter(destination, settings);
  for (var datasourceName in settings.datasources) {
    var datasource = settings.datasources[datasourceName];
    writer.data(datasource.url, rdf + 'type', voID  + 'Dataset');
    writer.data(datasource.url, rdf + 'type', hydra + 'Collection');
    writer.data(datasource.url, dcTerms + 'title', '"' + datasource.title + '"');
  }
  writer.end();
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
