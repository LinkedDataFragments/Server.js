/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A NTriplesWriter represents Linked Data Fragments as N-Triples. */

var TurtleWriter = require('./TurtleWriter');

// Creates a new NTriplesWriter
function NTriplesWriter() {
  if (!(this instanceof NTriplesWriter))
    return new NTriplesWriter();
}
NTriplesWriter.prototype = Object.create(TurtleWriter.prototype);

NTriplesWriter.prototype._format = 'application/n-triples';

module.exports = NTriplesWriter;
