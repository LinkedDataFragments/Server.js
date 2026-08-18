/*! @license ©2014–2017 Ruben Verborgh, Ghent University - imec */
/** An N3Datasource fetches data from Turtle/TriG/N-Triples/N-Quads/N3 documents. */

import { MemoryDatasource } from '@ldf/core/lib/datasources/MemoryDatasource';
import { N3ParserExtended as N3Parser } from '@ldf/core/lib/N3ParserExtended';
import type { Quad } from 'rdf-js';
import type { DatasourceOptions } from '@ldf/core';

let ACCEPT = 'application/trig;q=1.0,application/n-quads;q=0.9,text/turtle;q=0.8,application/n-triples;q=0.7,text/n3;q=0.4';

// Creates a new N3Datasource
export class N3Datasource extends MemoryDatasource {
  constructor(options: DatasourceOptions) {
    super(options);
    this._url = options && (options.url || options.file);
  }

  // Retrieves all quads from the document
  protected override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void): void {
    let document = this._fetch({ url: this._url!, headers: { accept: ACCEPT } });
    N3Parser.resetBlankNodePrefix();
    new N3Parser({ factory: this.dataFactory }).parse(document, (error: Error, quad: Quad) => {
      quad ? addQuad(quad) : done(error);
    });
  }
}

