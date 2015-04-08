var SubstringRouter = require('../../lib/routers/SubstringRouter');

describe('SubstringRouter', function () {
  describe('The SubstringRouter module', function () {
    it('should be a function', function () {
      SubstringRouter.should.be.a('function');
    });

    it('should be a SubstringRouter constructor', function () {
      new SubstringRouter().should.be.an.instanceof(SubstringRouter);
    });

    it('should create new SubstringRouter objects', function () {
      SubstringRouter().should.be.an.instanceof(SubstringRouter);
    });
  });

  describe('A SubstringRouter instance', function () {
    var router = new SubstringRouter();

    describe('extractUrlParams', function () {
      describe('with an existing query', function () {
        [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should not change the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an empty object parameter',
            'http://example.org/?object=',
            'should not add the object to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an IRI object parameter',
            'http://example.org/?object=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should not add the object to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an empty substring expression as object parameter',
            'http://example.org/?object=**',
            'should not add the object to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a prefix expression',
            'http://example.org/?object=*aBc',
            'should not add the object to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a suffix expression',
            'http://example.org/?object=aBc*',
            'should not add the object to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a non-empty substring expression as object parameter',
            'http://example.org/?object=*aBc*',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { substring: true }, substring: 'aBc' },
          ],
        ]
        .forEach(function (args) { test.extractQueryParams.apply(router, args); });
      });
    });
  });
});
