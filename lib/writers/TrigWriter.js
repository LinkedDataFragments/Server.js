/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TrigWriter represents Linked Data Fragments as TriG. */

var N3 = require('n3'),
    TurtleWriter = require('./TurtleWriter');

var metadataToData = 'http://xmlns.com/foaf/0.1/primaryTopic';

// Creates a new TrigWriter
function TrigWriter() {
  if (!(this instanceof TrigWriter))
    return new TrigWriter();
}
TrigWriter.prototype = Object.create(TurtleWriter.prototype);

TrigWriter.prototype._format = 'application/trig';

// Creates a writer that serializes triples to TriG
TrigWriter.prototype._createWriter = function (destination, settings) {
  var writer = new N3.Writer({ format: this._format, prefixes: settings.prefixes }),
      fragmentUrl = settings.fragment && settings.fragment.url || '', metadataGraph;
  return {
    // Adds the data triple to the output
    data: function (s, p, o) {
      writer.addTriple(s, p, o, '');
    },
    // Adds the metadata triple to the output
    meta: function (s, p, o) {
      // Relate the metadata graph to the data
      if (!metadataGraph)
        writer.addTriple(metadataGraph = fragmentUrl + '#metadata',
                         metadataToData, fragmentUrl || '#', metadataGraph);
      // Write the triple
      if (s && p && o && !N3.Util.isLiteral(s))
        writer.addTriple(s, p, o, metadataGraph);
    },
    // Ends the output and flushes the stream
    end: function () {
      writer.end(function (error, output) { destination.end(output); });
    },
  };
};

module.exports = TrigWriter;
