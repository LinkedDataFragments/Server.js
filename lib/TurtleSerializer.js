/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** TurtleSerializer writes triples to a stream as Turtle */

var N3Util = require('n3').Util;

// Creates a new TurtleSerializer
function TurtleSerializer(outputStream) {
  this._outputStream = outputStream;
}

TurtleSerializer.prototype = {
  // Writes the arguments to the stream
  _write: function () {
    for (var i = 0; i < arguments.length; i++)
      this._outputStream.write(arguments[i]);
  },

  // Writes the specified triple
  writeTriple: function (triple) {
    //TODO: this serialization is very primitive; escaping is necessary
    this._write('<', triple.subject, '> ');
    this._write('<', triple.predicate, '> ');
    if (N3Util.isLiteral(triple.object))
      this._write(triple.object);
    else
      this._write('<', triple.object, '>');
    this._write('.\n');
  },

  // Writes the specified triples
  writeTriples: function (triples) {
    for (var i = 0; i < triples.length; i++)
      this.writeTriple(triples[i]);
  },

  // Ends the Turtle stream
  end: function () {
    this._outputStream.end();
  },
};

module.exports = TurtleSerializer;
