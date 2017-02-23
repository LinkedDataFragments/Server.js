/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* A VersionRouter routes version queries */

// Creates a new VersionRouter.
function VersionRouter(config) {
  if (!(this instanceof VersionRouter))
    return new VersionRouter(config);
  config = config || {};
}

// Extracts a page parameter from the request and adds it to the query
VersionRouter.prototype.extractQueryParams = function (request, query) {
  var version = parseInt(request.url && request.url.query && request.url.query.version, 10),
      versionStart = parseInt(request.url && request.url.query && request.url.query.versionStart, 10),
      versionEnd = parseInt(request.url && request.url.query && request.url.query.versionEnd, 10),
      versionQuery = request.url && request.url.query && request.url.query.versionQuery,
      features = query.features || (query.features = {});

  if (version >= 0) {
    query.version = version;
    query.versionType = 'VersionMaterialized';
    features.version = true;
  }
  else if (versionStart >= 0 && versionEnd >= 0) {
    query.versionStart = versionStart;
    query.versionEnd = versionEnd;
    query.versionType = 'DeltaMaterialized';
    features.version = true;
  }
  else if (versionQuery) {
    query.versionType = 'Version';
    features.version = true;
  }
  else {
    query.versionType = 'VersionMaterialized';
    features.version = true;
  }
};

module.exports = VersionRouter;
