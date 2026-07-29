/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An HdtDatasource loads and queries an HDT document in-process. */

import Datasource = require('@ldf/core/lib/datasources/Datasource');
import * as hdt from 'hdt';
import ExternalHdtDatasource = require('./ExternalHdtDatasource');
import type { Quad } from 'rdf-js';
import type { BufferedIterator } from 'asynciterator';
import type { DatasourceOptions, Query } from '@ldf/core/lib/types';

interface HdtDatasourceOptions extends DatasourceOptions {
  external?: boolean;
}

// Creates a new HdtDatasource
class HdtDatasource extends Datasource {
  protected _hdtFile!: string;
  protected _hdtDocument?: hdt.Document;

  constructor(options: HdtDatasourceOptions) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);

    options = options || {};
    // Switch to external HDT datasource if the `external` flag is set
    if (options.external)
      return new ExternalHdtDatasource(options) as unknown as HdtDatasource;
    this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
  }

  // Loads the HDT datasource
  protected override async _initialize(): Promise<void> {
    this._hdtDocument = await hdt.fromFile(this._hdtFile, { dataFactory: this.dataFactory as any });
  }

  // Writes the results of the query to the given quad stream
  protected override _executeQuery(query: Query, destination: BufferedIterator<Quad>): void {
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
          estimatedTotalCount = offset + (tripleCount < query.limit! ? tripleCount : 2 * tripleCount);
        destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
        // Add the triples to the output
        for (let i = 0; i < tripleCount; i++)
          (destination as unknown as { _push(item: Quad): void })._push(triples[i]);
        destination.close();
      },
      (error) => { destination.emit('error', error); });
  }

  // Closes the data source
  override close(done?: (error?: Error) => void): void {
    // Close the HDT document if it is open
    if (this._hdtDocument) {
      this._hdtDocument.close().then(done as any, done as any);
      delete this._hdtDocument;
    }
    // If initialization was still pending, close immediately after initializing
    else if (!this.initialized)
      this.on('initialized', this.close.bind(this, done));
  }
}


export = HdtDatasource;
