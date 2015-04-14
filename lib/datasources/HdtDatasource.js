/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An HdtDatasource loads and queries an HDT document in-process. */

var Datasource = require('./Datasource'),
    fs = require('fs'),
    hdt = require('hdt'),
    ExternalHdtDatasource = require('./ExternalHdtDatasource');

// Creates a new HdtDatasource
function HdtDatasource(options) {
  if (!(this instanceof HdtDatasource))
    return new HdtDatasource(options);
  Datasource.call(this, options);

  // Switch to external HDT datasource if the `external` flag is set
  options = options || {};
  if (options.external)
    return new ExternalHdtDatasource(options);

  // Test whether the HDT file exists
  var hdtFile = (options.file || '').replace(/^file:\/\//, '');
  if (!fs.existsSync(hdtFile) || !/\.hdt$/.test(hdtFile))
    throw Error('Not an HDT file: ' + hdtFile);

  // Store requested operations until the HDT document is loaded
  var operations = ['close', 'searchTriples', 'searchLiterals'], pendingOperations = [];
  operations.forEach(function (operation) {
    this[operation] = function () { pendingOperations.push({ op: operation, args: arguments }); };
  }, this._hdtDocument = {});

  // Load the HDT document
  hdt.fromFile(hdtFile, function (error, hdtDocument) {
    if (!error)
      this._hdtDocument = hdtDocument;
    // Set up an error document if the HDT document could not be opened
    else {
      function sendError() {
        var callback = arguments[arguments.length - 1];
        (typeof callback === 'function') && callback(error);
      }
      operations.forEach(function (operation) { this[operation] = sendError; }, this._hdtDocument);
    }
    // Execute pending operations
    pendingOperations.forEach(function (o) { hdtDocument[o.op].apply(hdtDocument, o.args); });
  }, this);
}
Datasource.extend(HdtDatasource, ['all', 'triplePattern', 'substring', 'limit', 'offset', 'totalCount']);

// Writes the results of the query to the given triple stream
HdtDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  if (!query.features.substring)
    this._queryTriplePattern(query, query, tripleStream, metadataCallback);
  else
    this._querySubstring(query.substring, query, tripleStream, metadataCallback);
};

// Writes the results of the triple pattern query to the given triple stream
HdtDatasource.prototype._queryTriplePattern = function (pattern, options, tripleStream, metadataCallback) {
  this._hdtDocument.searchTriples(pattern.subject, pattern.predicate, pattern.object, options,
    function (error, triples, estimatedTotalCount) {
      if (error) return tripleStream.emit('error', error);
      // Ensure the estimated total count is as least as large as the number of triples
      var tripleCount = triples.length, offset = options.offset || 0;
      if (tripleCount && estimatedTotalCount < offset + tripleCount)
        estimatedTotalCount = offset + (tripleCount < options.limit ? tripleCount : 2 * tripleCount);
      metadataCallback({ totalCount: estimatedTotalCount });
      // Add the triples to the stream
      for (var i = 0; i < tripleCount; i++)
        tripleStream.push(triples[i]);
      tripleStream.push(null);
    });
};

// Writes the results of the substring query to the given triple stream
HdtDatasource.prototype._querySubstring = function (substring, options, tripleStream, metadataCallback) {
  this._hdtDocument.searchLiterals(substring, options,
    function (error, literals, totalCount) {
      if (error) return tripleStream.emit('error', error);
      metadataCallback({ totalCount: totalCount });
      this._pushLiterals(tripleStream, literals, options.offset);
    }, this);
};

// Closes the data source
HdtDatasource.prototype.close = function (done) {
  this._hdtDocument.close(done);
};

module.exports = HdtDatasource;
