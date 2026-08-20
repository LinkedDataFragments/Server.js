/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* A PageRouter routes page numbers to offsets */

import type { Query, RouterRequest } from '../types';

// Creates a new PageRouter with the given page size, which defaults to 100.
export class PageRouter {
  pageSize: number;

  constructor(config?: { pageSize?: number }) {
    config = config || {};
    let pageSize = config.pageSize;
    this.pageSize = pageSize !== undefined && isFinite(pageSize) && pageSize > 1 ? ~~pageSize : 100;
  }

  // Extracts a page parameter from the request and adds it to the query
  extractQueryParams(request: RouterRequest, query: Query): void {
    let page: string | string[] | number | undefined = request.url && request.url.query && request.url.query.page,
        features = query.features || (query.features = {});

    // Set the limit to the page size
    features.limit = true, query.limit = this.pageSize;

    // If a page is given, adjust the offset
    if (page && /^\d+$/.test(page as string) && (page = parseInt(page as string, 10)) > 1)
      features.offset = true, query.offset = this.pageSize * (page - 1);
  }
}

