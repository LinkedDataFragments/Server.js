/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An OstrichDatasource loads and queries an OSTRICH store in-process. */

var Datasource = require('./Datasource'),
    ostrich = require('ostrich-bindings');

// Creates a new OstrichDatasource
function OstrichDatasource(options) {
  if (!(this instanceof OstrichDatasource))
    return new OstrichDatasource(options);
  Datasource.call(this, options);

  options = options || {};
  this._ostrichPath = (options.path || '').replace(/^file:\/\//, '');
  this._skolemizeBlacklist['_:changeSetAdditions'] = true;
  this._skolemizeBlacklist['_:changeSetDeletions'] = true;
}
Datasource.extend(OstrichDatasource, ['triplePattern', 'limit', 'offset', 'totalCount', 'versioning']);

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

  var urlAppendix = query.version || query.version === 0 ? '&versionType=VersionMaterialized&version=' + query.version : null;
  var self = this;
  var queryFunction = this._ostrichStore['searchTriples' + query.versionType];
  if (!queryFunction)
    throw new Error('The version query type \'' + query.versionType + '\' does not exist.');
  queryFunction.call(this._ostrichStore, query.subject, query.predicate, query.object,
    { limit: query.limit, offset: query.offset, version: query.version,
      versionStart: query.versionStart, versionEnd: query.versionEnd === -1 ? self._ostrichStore.maxVersion : query.versionEnd },
    function (error, triples, estimatedTotalCount, hasExactCount) {
      if (error) return destination.emit('error', error);
      // Ensure the estimated total count is as least as large as the number of triples
      var tripleCount = triples.length, offset = query.offset || 0;
      if (tripleCount && estimatedTotalCount < offset + tripleCount)
        estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
      // Add the triples to the output
      var versionGraphNames = [];
      var versionGraphs = {};
      for (var i = 0; i < tripleCount; i++) {
        // Annotate DM queries with + or -
        if (query.versionType === 'DeltaMaterialized')
          triples[i].graph = triples[i].addition ? '_:changeSetAdditions' : '_:changeSetDeletions';
        // Annotate V queries with their version
        else if (query.versionType === 'Version') {
          var key = JSON.stringify(triples[i].versions);
          var id = versionGraphNames.indexOf(key);
          if (id < 0) {
            id = versionGraphNames.length;
            versionGraphNames.push(key);
            versionGraphs[key] = { id: id, versions: triples[i].versions };
          }
          triples[i].versionGraph = key;
          triples[i].graph = '_:versionGraph' + id;
          self._skolemizeBlacklist[triples[i].graph] = true;
        }
        else
          triples[i].urlAppendix = urlAppendix;
        destination._push(triples[i]);
      }
      destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount, maxVersion: self._ostrichStore.maxVersion, versionGraphs: versionGraphs });
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
