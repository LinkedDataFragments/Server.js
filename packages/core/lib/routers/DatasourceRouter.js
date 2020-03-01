/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* A DatasourceRouter routes URLs to data sources. */

var UrlData = require('../UrlData');

// Creates a new DatasourceRouter
class DatasourceRouter {
  constructor(options) {
    var urlData = options && options.urlData || new UrlData();
    this._baseLength = urlData.baseURLPath.length - 1;
  }
}

// Extracts the data source parameter from the request and adds it to the query
DatasourceRouter.prototype.extractQueryParams = function (request, query) {
  (query.features || (query.features = {})).datasource = true;
  var path = request.url && request.url.pathname || '/';
  query.datasource = path.substr(this._baseLength);
};

module.exports = DatasourceRouter;
