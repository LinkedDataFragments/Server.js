/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A NQuadsWriter represents Linked Data Fragments as N-Quads. */

var TrigWriter = require('./TrigWriter');

// Creates a new NQuadsWriter
function NQuadsWriter() {
  if (!(this instanceof NQuadsWriter))
    return new NQuadsWriter();
}
NQuadsWriter.prototype = Object.create(TrigWriter.prototype);

NQuadsWriter.prototype._format = 'application/n-quads';

module.exports = NQuadsWriter;
