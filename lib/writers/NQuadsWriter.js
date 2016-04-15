/** An NQuadsLdWriter represents Linked Data Fragments as N-Quads. */

var _ = require('lodash'),
  TurtleWriter = require('./TurtleWriter');

// Creates a new JsonLdWriter
function NQuadsWriter() {
  if (!(this instanceof NQuadsWriter))
    return new NQuadsWriter();
}
NQuadsWriter.prototype = new TurtleWriter();

NQuadsWriter.prototype._patternFields = TurtleWriter.prototype._patternFields.concat(['graph']);

// Creates a writer that serializes triples to N-Quads
NQuadsWriter.prototype._createWriter = function (destination, settings) {
  var superWriter = TurtleWriter.prototype._createWriter(destination, settings);
  var writer = superWriter.rawWriter;
  return {
    // Adds the data triple to the output
    data: function (s, p, o, c) {
      // TODO: extend the N3 Writer, currently done in a very hacky way...
      writer.addTriple(s, p, o);
      if(c) {
        writer._write(' ', null);
        writer._write('<' + c + '>');
      }
    },
    // These two functions are identical to the ones for triples.
    meta: superWriter.meta,
    end: superWriter.end,
  };
};

module.exports = NQuadsWriter;