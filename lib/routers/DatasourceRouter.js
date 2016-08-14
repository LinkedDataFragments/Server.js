/*! @license MIT ©2014-2016 Ruben Verborgh - Ghent University / iMinds */
/* A DatasourceRouter routes URLs to data sources. */

// Creates a new DatasourceRouter
function DatasourceRouter() {
  if (!(this instanceof DatasourceRouter))
    return new DatasourceRouter();
}

// Extracts the data source parameter from the request and adds it to the query
DatasourceRouter.prototype.extractQueryParams = function (request, query) {
  (query.features || (query.features = {})).datasource = true;
  query.datasource = /^\/?(.*)$/.exec(request.url && request.url.pathname || '')[1];
};

module.exports = DatasourceRouter;
