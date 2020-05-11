/*! @license ©2014–2017 Ruben Verborgh, Ghent University - imec */
/** An N3Datasource fetches data from Turtle/TriG/N-Triples/N-Quads/N3 documents. */

let MemoryDatasource = require('@ldf/core').datasources.MemoryDatasource,
    N3Parser = require('n3').Parser;

let ACCEPT = 'application/trig;q=1.0,application/n-quads;q=0.9,text/turtle;q=0.8,application/n-triples;q=0.7,text/n3;q=0.4';

// Creates a new N3Datasource
class N3Datasource extends MemoryDatasource {
  constructor(options) {
    super(options);
    this._url = options && (options.url || options.file);
  }

  // Retrieves all quads from the document
  _getAllQuads(addQuad, done) {
    let document = this._fetch({ url: this._url, headers: { accept: ACCEPT } }, done);
    N3Parser._resetBlankNodePrefix();
    new N3Parser({ factory: this.dataFactory }).parse(document, (error, quad) => {
      quad ? addQuad(quad) : done(error);
    });
  }
}

module.exports = N3Datasource;
