/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An empty data source doesn't contain any quads. */

import type { Quad } from 'rdf-js';
import { MemoryDatasource } from './MemoryDatasource';
import type { DatasourceOptions } from '../types';

// Creates a new EmptyDatasource
export class EmptyDatasource extends MemoryDatasource {
  constructor(options: DatasourceOptions) {
    super(options);
  }

  // Retrieves all quads in the datasource
  protected override _getAllQuads(addQuad: (quad: Quad) => void, done: (error?: Error) => void): void { done(); }
}

