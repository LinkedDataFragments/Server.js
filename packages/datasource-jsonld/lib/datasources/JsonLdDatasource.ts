/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An JsonLdDatasource fetches data from a JSON-LD document. */

import { MemoryDatasource } from '@ldf/core/lib/datasources/MemoryDatasource';
import { JsonLdParser } from 'jsonld-streaming-parser';
import type { Quad } from 'rdf-js';
import type { DatasourceOptions } from '@ldf/core';

let ACCEPT = 'application/ld+json;q=1.0,application/json;q=0.7';

// Creates a new JsonLdDatasource
export class JsonLdDatasource extends MemoryDatasource {
  constructor(options: DatasourceOptions) {
    super(options);
  }

  // Retrieves all quads from the document
  protected override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void): void {
    let document = this._fetch({ url: this._url!, headers: { accept: ACCEPT } });
    new JsonLdParser({ baseIRI: this._url, dataFactory: this.dataFactory })
      .import(document)
      .on('error', done)
      .on('data', addQuad)
      .on('end', done);
  }
}

