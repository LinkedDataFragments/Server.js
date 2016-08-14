/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var PageRouter = require('../../lib/routers/PageRouter');

describe('PageRouter', function () {
  describe('The PageRouter module', function () {
    it('should be a function', function () {
      PageRouter.should.be.a('function');
    });

    it('should be a PageRouter constructor', function () {
      new PageRouter().should.be.an.instanceof(PageRouter);
    });

    it('should create new PageRouter objects', function () {
      PageRouter().should.be.an.instanceof(PageRouter);
    });
  });

  describe('A PageRouter instance', function () {
    var router = new PageRouter();

    describe('extractUrlParams', function () {
      describe('with an existing query', function () {
        [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with an empty page parameter',
            'http://example.org/?page=',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with a non-numerical page parameter',
            'http://example.org/?page=foo',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with -1 as page parameter',
            'http://example.org/?page=-1',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with 0 as page parameter',
            'http://example.org/?page=0',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with 1 as page parameter',
            'http://example.org/?page=1',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
          [
            'a URL with 2 as page parameter',
            'http://example.org/?page=2',
            'should add the default page size as limit and set the offset',
            { a: 1 },
            { a: 1, features: { limit: true, offset: true }, limit: 100, offset: 100 },
          ],
          [
            'a URL with 3 as page parameter',
            'http://example.org/?page=3',
            'should add the default page size as limit and set the offset',
            { a: 1, features: { a: true, b: true } },
            { a: 1, features: { a: true, b: true, limit: true, offset: true }, limit: 100, offset: 200 },
          ],
        ]
        .forEach(function (args) { test.extractQueryParams.apply(router, args); });
      });
    });
  });

  describe('A PageRouter instance with a given page size', function () {
    var router = new PageRouter({ pageSize: 250 });

    describe('extractUrlParams', function () {
      describe('with an existing query', function () {
        [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with an empty page parameter',
            'http://example.org/?page=',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with a non-numerical page parameter',
            'http://example.org/?page=foo',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with -1 as page parameter',
            'http://example.org/?page=-1',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with 0 as page parameter',
            'http://example.org/?page=0',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with 1 as page parameter',
            'http://example.org/?page=1',
            'should add the page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 250 },
          ],
          [
            'a URL with 2 as page parameter',
            'http://example.org/?page=2',
            'should add the page size as limit and set the offset',
            { a: 1 },
            { a: 1, features: { limit: true, offset: true }, limit: 250, offset: 250 },
          ],
          [
            'a URL with 3 as page parameter',
            'http://example.org/?page=3',
            'should add the page size as limit and set the offset',
            { a: 1, features: { a: true, b: true } },
            { a: 1, features: { a: true, b: true, limit: true, offset: true }, limit: 250, offset: 500 },
          ],
        ]
        .forEach(function (args) { test.extractQueryParams.apply(router, args); });
      });
    });
  });

  describe('A PageRouter instance with an invalid page size', function () {
    var router = new PageRouter({ pageSize: -1 });

    describe('extractUrlParams', function () {
      describe('with an existing query', function () {
        [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should add the default page size as limit',
            { a: 1 },
            { a: 1, features: { limit: true }, limit: 100 },
          ],
        ]
        .forEach(function (args) { test.extractQueryParams.apply(router, args); });
      });
    });
  });
});
