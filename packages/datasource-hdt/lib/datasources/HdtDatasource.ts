/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An HdtDatasource loads and queries an HDT document in-process. */

import { Datasource } from '@ldf/core/lib/datasources/Datasource';
import * as hdt from 'hdt';
import { ExternalHdtDatasource } from './ExternalHdtDatasource';
import type { Quad } from 'rdf-js';
import type { DatasourceOptions, Pushable, Query } from '@ldf/core';

interface HdtDatasourceOptions extends DatasourceOptions {
  external?: boolean;
}

// Creates a new HdtDatasource
export class HdtDatasource extends Datasource {
  protected _hdtFile: string;
  protected _hdtDocument?: hdt.Document;

  constructor(options: HdtDatasourceOptions) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);

    options = options || {};
    this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
    // Switch to external HDT datasource if the `external` flag is set
    if (options.external)
      return new ExternalHdtDatasource(options) as unknown as HdtDatasource;
  }

  // Loads the HDT datasource
  protected override async _initialize(): Promise<void> {
    this._hdtDocument = await hdt.fromFile(this._hdtFile, { dataFactory: this.dataFactory } as Parameters<typeof hdt.fromFile>[1]);
  }

  // Writes the results of the query to the given quad stream
  protected override _executeQuery(query: Query, destination: Pushable<Quad>): void {
    // Only the default graph has results
    if (query.graph && query.graph.termType !== 'DefaultGraph') {
      destination.setProperty('metadata', { totalCount: 0, hasExactCount: true });
      destination.close();
      return;
    }
    this._hdtDocument!.searchTriples(query.subject, query.predicate, query.object,
      { limit: query.limit, offset: query.offset })
      .then((result) => {
        let triples = result.triples,
            estimatedTotalCount = result.totalCount,
            hasExactCount = result.hasExactCount;
        // Ensure the estimated total count is as least as large as the number of triples
        let tripleCount = triples.length, offset = query.offset || 0;
        if (tripleCount && estimatedTotalCount < offset + tripleCount)
          estimatedTotalCount = offset + (tripleCount < Number(query.limit) ? tripleCount : 2 * tripleCount);
        destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
        // Add the triples to the output
        for (let i = 0; i < tripleCount; i++)
          destination._push(triples[i]);
        destination.close();
      },
      (error) => { destination.emit('error', error); });
  }

  // Closes the data source
  override close(done?: (error?: Error) => void): void {
    // Close the HDT document if it is open
    if (this._hdtDocument) {
      this._hdtDocument.close().then(() => { done && done(); }, done);
      delete this._hdtDocument;
    }
    // If initialization was still pending, close immediately after initializing
    else if (!this.initialized)
      this.on('initialized', this.close.bind(this, done));
  }
}


