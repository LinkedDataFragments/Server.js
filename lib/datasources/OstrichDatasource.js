/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An OstrichDatasource loads and queries an OSTRICH store in-process. */

var Datasource = require('./Datasource'),
    ostrich = require('ostrich');

// Creates a new OstrichDatasource
function OstrichDatasource(options) {
  if (!(this instanceof OstrichDatasource))
    return new OstrichDatasource(options);
  Datasource.call(this, options);

  options = options || {};
  this._ostrichPath = (options.path || '').replace(/^file:\/\//, '');
}
Datasource.extend(OstrichDatasource, ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount']);

// Loads the HDT datasource
OstrichDatasource.prototype._initialize = function (done) {
  ostrich.fromPath(this._ostrichPath, function (error, ostrichStore) {
    this._ostrichStore = ostrichStore;
    done(error);
  }, this);
};

// Writes the results of the query to the given quad stream
OstrichDatasource.prototype._executeQuery = function (query, destination) {
  // Only the default graph has results
  if (query.graph) {
    destination.setProperty('metadata', { totalCount: 0, hasExactCount: true });
    destination.close();
    return;
  }

  this._ostrichStore.searchTriplesVersionMaterialized(query.subject, query.predicate, query.object,
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
OstrichDatasource.prototype.close = function (done) {
  // Close the HDT document if it is open
  if (this._ostrichStore) {
    this._ostrichStore.close(done);
    delete this._ostrichStore;
  }
  // If initialization was still pending, close immediately after initializing
  else if (!this.initialized)
    this.on('initialized', this.close.bind(this, done));
};

module.exports = OstrichDatasource;
