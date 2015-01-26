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
  var pendingCloses = [], pendingSearches = [];
  this._hdtDocument = { close:  function () { pendingCloses.push(arguments); },
                        search: function () { pendingSearches.push(arguments); } };

  // Load the HDT document
  hdt.fromFile(hdtFile, function (error, hdtDocument) {
    // Set up an error document if the HDT document could not be opened
    this._hdtDocument = !error ? hdtDocument : hdtDocument = {
      close:  function (callback) { callback && callback(); },
      search: function (s, p, o, op, callback) { callback(error); },
    };
    // Execute pending operations
    pendingSearches.forEach(function (args) { hdtDocument.search.apply(hdtDocument, args); });
    pendingCloses.forEach(function (args) { hdtDocument.close.apply(hdtDocument, args); });
  }, this);
}
Datasource.extend(HdtDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Writes the results of the query to the given triple stream
HdtDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  this._hdtDocument.search(query.subject, query.predicate, query.object,
                           { limit: query.limit, offset: query.offset },
    function (error, triples, estimatedTotalCount) {
      if (error) return tripleStream.emit('error', error);
      // Ensure the estimated total count is as least as large as the number of triples
      var tripleCount = triples.length, offset = query.offset || 0;
      if (tripleCount && estimatedTotalCount < offset + tripleCount)
        estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
      metadataCallback({ totalCount: estimatedTotalCount });
      // Add the triples to the stream
      for (var i = 0; i < tripleCount; i++)
        tripleStream.push(triples[i]);
      tripleStream.push(null);
    });
};

// Closes the data source
HdtDatasource.prototype.close = function (done) {
  this._hdtDocument.close(done);
};

module.exports = HdtDatasource;
