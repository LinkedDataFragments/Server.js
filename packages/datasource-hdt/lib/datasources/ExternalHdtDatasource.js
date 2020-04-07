/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An ExternalHdtDatasource uses an external process to query an HDT document. */

let Datasource = require('@ldf/core').datasources.Datasource,
    fs = require('fs'),
    path = require('path'),
    N3Parser = require('n3').Parser,
    RdfString = require('rdf-string'),
    spawn = require('child_process').spawn;

let hdtUtility = path.join(__dirname, '../../node_modules/.bin/hdt');

// Creates a new ExternalHdtDatasource
class ExternalHdtDatasource extends Datasource {
  constructor(options) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);


    // Test whether the HDT file exists
    this._options = options = options || {};
    this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
  }

  // Prepares the datasource for querying
  async _initialize() {
    if (this._options.checkFile !== false) {
      if (!fs.existsSync(this._hdtFile))
        throw new Error('Not an HDT file: ' + this._hdtFile);
      if (!fs.existsSync(hdtUtility))
        throw new Error('hdt not found: ' + hdtUtility);
    }
  }

  // Writes the results of the query to the given quad stream
  _executeQuery(query, destination) {
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
          '--offset', offset, '--limit', limit, '--format', 'turtle',
          '--', hdtFile,
        ], { stdio: ['ignore', 'pipe', 'ignore'] });
    // Parse the result triples
    hdt.stdout.setEncoding('utf8');
    let parser = new N3Parser(), tripleCount = 0, estimatedTotalCount = 0, hasExactCount = true, dataFactory = this.dataFactory;
    parser.parse(hdt.stdout, (error, triple) => {
      if (error)
        destination.emit('error', new Error('Invalid query result: ' + error.message));
      else if (triple)
        tripleCount++, destination._push(RdfString.stringQuadToQuad(triple, dataFactory));
      else {
        // Ensure the estimated total count is as least as large as the number of triples
        if (tripleCount && estimatedTotalCount < offset + tripleCount)
          estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
        destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
        destination.close();
      }
    });
    parser._prefixes._ = '_:'; // Ensure blank nodes are named consistently

    // Extract the estimated number of total matches from the first (comment) line
    hdt.stdout.once('data', (header) => {
      estimatedTotalCount = parseInt(header.match(/\d+/), 10) || 0;
      hasExactCount = header.indexOf('estimated') < 0;
    });

    // Report query errors
    hdt.on('exit', (exitCode) => {
      exitCode && destination.emit('error', new Error('Could not query ' + hdtFile));
    });
  }
}

module.exports = ExternalHdtDatasource;
