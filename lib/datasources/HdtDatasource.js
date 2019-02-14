/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An HdtDatasource loads and queries an HDT document in-process. */

var Datasource = require('./Datasource'),
    hdt = require('hdt'),
    ExternalHdtDatasource = require('./ExternalHdtDatasource');

// Creates a new HdtDatasource
function HdtDatasource(options) {
  if (!(this instanceof HdtDatasource))
    return new HdtDatasource(options);
  Datasource.call(this, options);

  options = options || {};
  // Switch to external HDT datasource if the `external` flag is set
  if (options.external)
    return new ExternalHdtDatasource(options);
  this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
  this._hdtBufferSize = options.hdtBufferSize || 16384; // 2^14 seems to be an optimal buffer size
}
Datasource.extend(HdtDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Loads the HDT datasource
HdtDatasource.prototype._initialize = function (done) {
  var datasource = this;
  hdt.fromFile(this._hdtFile).then(function (hdtDocument) {
    datasource._hdtDocument = hdtDocument;
  }).then(done, done);
};

// Writes the results of the query to the given triple stream
HdtDatasource.prototype._executeQuery = async function (query, destination) {
  // Query smaller chunks if the limit is too large.
  var hdtDocument = this._hdtDocument;
  if (!query.limit || (query.limit > this._hdtBufferSize)) {
    var remainder = query.limit || Infinity;
    var first = true;
    for (var offset = query.offset || 0; (!query.limit || offset <= query.limit); offset += this._hdtBufferSize) {
      var resultCount = await search(query, Math.min(this._hdtBufferSize, remainder), offset, first, false);
      first = false;
      if (resultCount < this._hdtBufferSize) {
        destination.close();
        break;
      }
      remainder -= offset;
    }
  }
  else
    search(query, query.limit, query.offset, true, true);

  function search(query, limit, offset, emitMetadata, closeDestination) {
    return new Promise((resolve, reject) => {
      hdtDocument.searchTriples(query.subject, query.predicate, query.object,
        { limit: limit, offset: offset })
        .then(function (result) {
          var triples = result.triples,
              estimatedTotalCount = result.totalCount,
              hasExactCount = result.hasExactCount;
          resolve(triples.length);
          var tripleCount = triples.length, offset = query.offset || 0;
          if (emitMetadata) {
            // Ensure the estimated total count is as least as large as the number of triples
            if (tripleCount && estimatedTotalCount < offset + tripleCount)
              estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
            destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
          }
          // Add the triples to the output
          for (var i = 0; i < tripleCount; i++)
            destination._push(triples[i]);

          if (closeDestination)
            destination.close();
        },
          function (error) {
            destination.emit('error', error);
            reject(error);
          });
    });
  }
};

// Closes the data source
HdtDatasource.prototype.close = function (done) {
  // Close the HDT document if it is open
  if (this._hdtDocument) {
    this._hdtDocument.close().then(done, done);
    delete this._hdtDocument;
  }
  // If initialization was still pending, close immediately after initializing
  else if (!this.initialized)
    this.on('initialized', this.close.bind(this, done));
};

module.exports = HdtDatasource;
