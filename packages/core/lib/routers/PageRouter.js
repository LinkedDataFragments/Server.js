/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* A PageRouter routes page numbers to offsets */

// Creates a new PageRouter with the given page size, which defaults to 100.
class PageRouter {
  constructor(config) {
    config = config || {};
    this.pageSize = isFinite(config.pageSize) && config.pageSize > 1 ? ~~config.pageSize : 100;
  }

  // Extracts a page parameter from the request and adds it to the query
  extractQueryParams(request, query) {
    let page = request.url && request.url.query && request.url.query.page,
        features = query.features || (query.features = {});

    // Set the limit to the page size
    features.limit = true, query.limit = this.pageSize;

    // If a page is given, adjust the offset
    if (page && /^\d+$/.test(page) && (page = parseInt(page, 10)) > 1)
      features.offset = true, query.offset = this.pageSize * (page - 1);
  }
}

module.exports = PageRouter;
