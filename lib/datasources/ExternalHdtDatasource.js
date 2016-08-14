/*! @license MIT ©2014-2016 Ruben Verborgh - Ghent University / iMinds */
/* An ExternalHdtDatasource uses an external process to query an HDT document. */

var Datasource = require('./Datasource'),
    fs = require('fs'),
    path = require('path'),
    N3Parser = require('n3').Parser,
    spawn = require('child_process').spawn;

var hdtUtility = path.join(__dirname, '../../node_modules/.bin/hdt');

// Creates a new ExternalHdtDatasource
function ExternalHdtDatasource(options) {
  if (!(this instanceof ExternalHdtDatasource))
    return new ExternalHdtDatasource(options);
  Datasource.call(this, options);

  // Test whether the HDT file exists
  this._options = options = options || {};
  this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
}
Datasource.extend(ExternalHdtDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Prepares the datasource for querying
ExternalHdtDatasource.prototype._initialize = function (done) {
  if (this._options.checkFile !== false) {
    if (!fs.existsSync(this._hdtFile))
      return done(new Error('Not an HDT file: ' + this._hdtFile));
    if (!fs.existsSync(hdtUtility))
      return done(new Error('hdt not found: ' + hdtUtility));
  }
  done();
};

// Writes the results of the query to the given triple stream
ExternalHdtDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  // Execute the external HDT utility
  var hdtFile = this._hdtFile, offset = query.offset || 0, limit = query.limit || Infinity,
      hdt = spawn(hdtUtility, ['--query', (query.subject   || '?s') + ' ' +
                                          (query.predicate || '?p') + ' ' + (query.object || '?o'),
                               '--offset', offset, '--limit', limit, '--format', 'turtle',
                               '--', hdtFile], { stdio: ['ignore', 'pipe', 'ignore'] });
  // Parse the result triples
  hdt.stdout.setEncoding('utf8');
  var parser = new N3Parser(), tripleCount = 0, estimatedTotalCount = 0, hasExactCount = true;
  parser.parse(hdt.stdout, function (error, triple) {
    if (error)
      tripleStream.emit('error', new Error('Invalid query result: ' + error.message));
    else if (triple)
      tripleCount++, tripleStream.push(triple);
    else {
      // Ensure the estimated total count is as least as large as the number of triples
      if (tripleCount && estimatedTotalCount < offset + tripleCount)
        estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
      metadataCallback({ totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
      tripleStream.push(null);
    }
  });
  parser._prefixes._ = '_:'; // Ensure blank nodes are named consistently

  // Extract the estimated number of total matches from the first (comment) line
  hdt.stdout.once('data', function (header) {
    estimatedTotalCount = parseInt(header.match(/\d+/), 10) || 0;
    hasExactCount = header.indexOf('estimated') < 0;
  });

  // Report query errors
  hdt.on('exit', function (exitCode) {
    exitCode && tripleStream.emit('error', new Error('Could not query ' + hdtFile));
  });
};

module.exports = ExternalHdtDatasource;
