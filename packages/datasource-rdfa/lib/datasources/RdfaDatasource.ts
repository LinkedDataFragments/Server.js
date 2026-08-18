/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An RdfaDatasource fetches data from a JSON-LD document. */

import { MemoryDatasource } from '@ldf/core/lib/datasources/MemoryDatasource';
import { RdfaParser } from 'rdfa-streaming-parser';
import type { Quad } from 'rdf-js';
import type { DatasourceOptions } from '@ldf/core';

let ACCEPT = 'text/html;q=1.0,application/xhtml+xml;q=0.7';

// Creates a new RdfaDatasource
export class RdfaDatasource extends MemoryDatasource {
  constructor(options: DatasourceOptions) {
    super(options);
    this._url = options && (options.url || options.file);
  }

  // Retrieves all quads from the document
  protected override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void): void {
    let document = this._fetch({ url: this._url!, headers: { accept: ACCEPT } });
    new RdfaParser({ baseIRI: this._url, dataFactory: this.dataFactory })
      .import(document)
      .on('error', done)
      .on('data', addQuad)
      .on('end', done);
  }
}

