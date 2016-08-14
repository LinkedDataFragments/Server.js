/*! @license MIT ©2014-2016 Ruben Verborgh - Ghent University / iMinds */
/* A TurtleDatasource fetches data from a Turtle document. */

var MemoryDatasource = require('./MemoryDatasource'),
    N3Parser = require('n3').Parser;

var ACCEPT = 'text/turtle;q=1.0,application/n-triples;q=0.7,text/n3;q=0.6';

// Creates a new TurtleDatasource
function TurtleDatasource(options) {
  if (!(this instanceof TurtleDatasource))
    return new TurtleDatasource(options);
  MemoryDatasource.call(this, options);
  this._url = options && (options.url || options.file);
}
MemoryDatasource.extend(TurtleDatasource);

// Retrieves all triples from the document
TurtleDatasource.prototype._getAllTriples = function (addTriple, done) {
  var document = this._fetch({ url: this._url, headers: { accept: ACCEPT } }, done);
  N3Parser._resetBlankNodeIds();
  new N3Parser().parse(document, function (error, triple) {
    triple ? addTriple(triple) : done(error);
  });
};

module.exports = TurtleDatasource;
