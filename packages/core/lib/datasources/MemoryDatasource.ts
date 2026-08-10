/*! @license MIT ©2014-2015 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A MemoryDatasource queries a set of in-memory quads. */

import { Store as N3Store } from 'n3';
import type { Quad } from 'rdf-js';
import { Datasource } from './Datasource';
import type { DatasourceOptions, Pushable, Query } from '../types';

// Creates a new MemoryDatasource
export class MemoryDatasource extends Datasource {
  protected _url?: string;
  protected _quadStore!: N3Store;

  constructor(options: DatasourceOptions) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);
    if (options.file) {
      if (!options.file.startsWith('file://') && !options.file.startsWith('http://') && !options.file.startsWith('https://'))
        options.file = `file://${options.file}`;
    }

    this._url = options && (options.url || options.file);
  }

  // Prepares the datasource for querying
  protected override _initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      let quadStore = this._quadStore = new N3Store();
      this._getAllQuads((quad: Quad) => { quadStore.addQuad(quad); }, (error?: Error) => {
        if (error)
          return reject(error);
        return resolve();
      });
    });
  }

  // Retrieves all quads in the datasource
  protected _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void): void {
    throw new Error('_getAllQuads is not implemented');
  }

  // Writes the results of the query to the given quad stream
  protected override _executeQuery(query: Query, destination: Pushable<Quad>): void {
    let offset = query.offset || 0, limit = query.limit || Infinity,
        quads = this._quadStore.getQuads(query.subject ?? null, query.predicate ?? null, query.object ?? null, query.graph ?? null);
    // Send the metadata
    destination.setProperty('metadata', { totalCount: quads.length, hasExactCount: true });
    // Send the requested subset of quads
    for (let i = offset, l = Math.min(offset + limit, quads.length); i < l; i++)
      destination._push(quads[i]);
    destination.close();
  }
}

