/*! @license ©2014 Ruben Taelman, Ghent University - imec */

/** An TrigDatasource fetches data from a Trig document. */

var MemoryDatasource = require('./MemoryDatasource'),
    N3Parser = require('n3').Parser;

var ACCEPT = 'application/trig;q=1.0,application/n-quads;q=0.7,text/n3;q=0.6';

// Creates a new TurtleDatasource
function TrigDatasource(options) {
  if (!(this instanceof TrigDatasource))
    return new TrigDatasource(options);
  MemoryDatasource.call(this, options);
  this._url = options && (options.url || options.file);
}
MemoryDatasource.extend(TrigDatasource);

// Retrieves all quads from the document
TrigDatasource.prototype._getAllQuads = function (addQuad, done) {
  var document = this._fetch({ url: this._url, headers: { accept: ACCEPT } }, done);
  N3Parser._resetBlankNodeIds();
  new N3Parser().parse(document, function (error, quad) {
    quad ? addQuad(quad) : done(error);
  });
};

module.exports = TrigDatasource;
