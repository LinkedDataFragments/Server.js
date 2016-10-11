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
}
Datasource.extend(HdtDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Loads the HDT datasource
HdtDatasource.prototype._initialize = function (done) {
  hdt.fromFile(this._hdtFile, function (error, hdtDocument) {
    this._hdtDocument = hdtDocument;
    done(error);
  }, this);
};

// Writes the results of the query to the given triple stream
HdtDatasource.prototype._executeQuery = function (query, destination) {
  this._hdtDocument.search(query.subject, query.predicate, query.object,
                           { limit: query.limit, offset: query.offset },
    function (error, triples, estimatedTotalCount, hasExactCount) {
      if (error) return destination.emit('error', error);
      // Ensure the estimated total count is as least as large as the number of triples
      var tripleCount = triples.length, offset = query.offset || 0;
      if (tripleCount && estimatedTotalCount < offset + tripleCount)
        estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
      destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
      // Add the triples to the output
      for (var i = 0; i < tripleCount; i++)
        destination._push(triples[i]);
      destination.close();
    });
};

// Closes the data source
HdtDatasource.prototype.close = function (done) {
  // Close the HDT document if it is open
  if (this._hdtDocument) {
    this._hdtDocument.close(done);
    delete this._hdtDocument;
  }
  // If initialization was still pending, close immediately after initializing
  else if (!this.initialized)
    this.on('initialized', this.close.bind(this, done));
};

module.exports = HdtDatasource;
