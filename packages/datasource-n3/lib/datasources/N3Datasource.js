/*! @license ©2014–2017 Ruben Verborgh, Ghent University - imec */
/** An N3Datasource fetches data from Turtle/TriG/N-Triples/N-Quads/N3 documents. */

var MemoryDatasource = require('@ldf/core').datasources.MemoryDatasource,
    N3Parser = require('n3').Parser;

var ACCEPT = 'application/trig;q=1.0,application/n-quads;q=0.9,text/turtle;q=0.8,application/n-triples;q=0.7,text/n3;q=0.4';

// Creates a new N3Datasource
class N3Datasource extends MemoryDatasource {
  constructor(options) {
    super(options);
    this._url = options && (options.url || options.file);
  }
}
MemoryDatasource.extend(N3Datasource);

// Retrieves all quads from the document
N3Datasource.prototype._getAllQuads = function (addQuad, done) {
  var document = this._fetch({ url: this._url, headers: { accept: ACCEPT } }, done);
  N3Parser._resetBlankNodeIds();
  new N3Parser().parse(document, function (error, quad) {
    quad ? addQuad(quad) : done(error);
  });
};

module.exports = N3Datasource;
