/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An IndexRouter links URLs to indexes. */

var url = require('url'),
    path = require('path');

// Creates a new IndexRouter
function IndexRouter() {
  if (!(this instanceof IndexRouter))
    return new IndexRouter();
}

// Extracts the data source parameter from the request and adds it to the query
IndexRouter.prototype.extractQueryParams = function (request, query) {
  var datasourceMatcher = /^\/?([^\/]*)\/(.*)$/; // TODO
  var indexSuffixMatcher = /^range-([^\/]*)\/?(.*)$/; // TODO

  if (query.features.datasource) {
    var mainMatch = datasourceMatcher.exec(request.url && request.url.pathname || '');
    var datasourceName = mainMatch[1];
    var indexSuffix = mainMatch[2];
    var queryString = request.url.query;

    request.url.pathname = path.resolve(request.url.pathname, '..');
    query.rangeUri = url.format(request.url) + "/"; // The range gate/fragment base uri
    query.index = datasourceName; // The index identifier
    query.rangePath = []; // The navigation path inside the index

    query.rangeGateBounds = { initial: queryString.initial, final: queryString.final }; // The bounds of the range gate
    query.rangeGate = false; // If we are requesting a range gate

    // We can have a nested index, so we have to loop
    while(indexSuffix !== '' && indexSuffix !== '/') {
      var subMatch = indexSuffixMatcher.exec(indexSuffix);
      var rangeType = subMatch[1];
      indexSuffix = subMatch[2];
      if (rangeType == 'gate') {
        query.rangeGate = true;
        if (indexSuffix !== '' && indexSuffix !== '/') {
          throw new Error('Unable to further navigate in a range gate.');
        }
      } else {
        query.rangePath.push(rangeType);
      }
    }
  }
};

module.exports = IndexRouter;
