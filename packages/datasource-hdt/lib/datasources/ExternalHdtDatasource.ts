/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An ExternalHdtDatasource uses an external process to query an HDT document. */

import Datasource = require('@ldf/core/lib/datasources/Datasource');
import * as fs from 'fs';
import * as path from 'path';
import { Parser as N3Parser } from 'n3';
import { spawn } from 'child_process';
import type { Quad } from 'rdf-js';
import type { BufferedIterator } from 'asynciterator';
import type { DatasourceOptions, Query } from '@ldf/core/lib/types';

let hdtUtility = path.join(__dirname, '../../node_modules/.bin/hdt');

interface ExternalHdtDatasourceOptions extends DatasourceOptions {
  checkFile?: boolean;
}

// Creates a new ExternalHdtDatasource
class ExternalHdtDatasource extends Datasource {
  protected _options: ExternalHdtDatasourceOptions;
  protected _hdtFile: string;

  constructor(options: ExternalHdtDatasourceOptions) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);


    // Test whether the HDT file exists
    this._options = options = options || {};
    this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
  }

  // Prepares the datasource for querying
  protected override async _initialize(): Promise<void> {
    if (this._options.checkFile !== false) {
      if (!fs.existsSync(this._hdtFile))
        throw new Error('Not an HDT file: ' + this._hdtFile);
      if (!fs.existsSync(hdtUtility))
        throw new Error('hdt not found: ' + hdtUtility);
    }
  }

  // Writes the results of the query to the given quad stream
  protected override _executeQuery(query: Query, destination: BufferedIterator<Quad>): void {
    // Only the default graph has results
    if (query.graph && query.graph.termType !== 'DefaultGraph') {
      destination.setProperty('metadata', { totalCount: 0, hasExactCount: true });
      destination.close();
      return;
    }

    // Execute the external HDT utility
    let hdtFile = this._hdtFile, offset = query.offset || 0, limit = query.limit || Infinity,
        hdt = spawn(hdtUtility, [
          '--query', (query.subject   || '?s') + ' ' +
          (query.predicate || '?p') + ' ' + (query.object || '?o'),
          '--offset', offset as unknown as string, '--limit', limit as unknown as string, '--format', 'turtle',
          '--', hdtFile,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });
    // Parse the result triples
    hdt.stdout!.setEncoding('utf8');
    let parser = new N3Parser(), tripleCount = 0, estimatedTotalCount = 0, hasExactCount = true;
    parser.parse(hdt.stdout as any, (error: Error, triple: Quad) => {
      if (error)
        destination.emit('error', new Error('Invalid query result: ' + error.message));
      else if (triple)
        tripleCount++, (destination as any)._push(triple);
      else {
        // Ensure the estimated total count is as least as large as the number of triples
        if (tripleCount && estimatedTotalCount < offset + tripleCount)
          estimatedTotalCount = offset + (tripleCount < query.limit! ? tripleCount : 2 * tripleCount);
        destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
        destination.close();
      }
    });
    (parser as any)._prefixes._ = '_:'; // Ensure blank nodes are named consistently

    // Extract the estimated number of total matches from the first (comment) line
    hdt.stdout!.once('data', (header: string) => {
      estimatedTotalCount = parseInt(header.match(/\d+/) as any, 10) || 0;
      hasExactCount = header.indexOf('estimated') < 0;
    });

    // Report query errors
    hdt.on('exit', (exitCode) => {
      exitCode && destination.emit('error', new Error('Could not query ' + hdtFile));
    });
  }
}

export = ExternalHdtDatasource;
