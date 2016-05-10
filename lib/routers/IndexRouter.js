/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An IndexRouter links URLs to indexes. */

// Creates a new IndexRouter
function IndexRouter() {
  if (!(this instanceof IndexRouter))
    return new IndexRouter();
}

// Extracts the data source parameter from the request and adds it to the query
IndexRouter.prototype.extractQueryParams = function (request, query) {
  if(query.features.datasource) {
    query.index = /^\/?(.*)$/.exec(request.url && request.url.pathname || '')[1];
  }
};

module.exports = IndexRouter;
