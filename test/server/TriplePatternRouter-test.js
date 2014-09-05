var TriplePatternRouter = require('../../lib/server/TriplePatternRouter');

describe('TriplePatternRouter', function () {
  describe('The TriplePatternRouter module', function () {
    it('should be a function', function () {
      TriplePatternRouter.should.be.a('function');
    });

    it('should be a TriplePatternRouter constructor', function () {
      new TriplePatternRouter().should.be.an.instanceof(TriplePatternRouter);
    });

    it('should create new TriplePatternRouter objects', function () {
      TriplePatternRouter().should.be.an.instanceof(TriplePatternRouter);
    });
  });

  describe('A TriplePatternRouter instance', function () {
    var router = new TriplePatternRouter();

    describe('extractUrlParams', function () {
      describe('with an existing query', function () {
        [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should not change the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with an empty subject parameter',
            'http://example.org/?subject=',
            'should not add the subject to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with an IRI subject parameter',
            'http://example.org/?subject=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the subject to the query',
            { a: 1 }, { a: 1, subject: 'http://example.org/foo#bar' }
          ],
          [
            'a URL with an IRI subject parameter in angular brackets',
            'http://example.org/?subject=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the subject to the query',
            { a: 1 }, { a: 1, subject: 'http://example.org/foo#bar' }
          ],
          [
            'a URL with a variable subject parameter',
            'http://example.org/?subject=%3Ffoo',
            'should not add the subject to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with a blank subject parameter',
            'http://example.org/?subject=_:foo',
            'should not add the subject to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with a literal subject parameter',
            'http://example.org/?subject=%22foo%22',
            'should not add the subject to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with an empty predicate parameter',
            'http://example.org/?predicate=',
            'should not add the predicate to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with an IRI predicate parameter',
            'http://example.org/?predicate=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the predicate to the query',
            { a: 1 }, { a: 1, predicate: 'http://example.org/foo#bar' }
          ],
          [
            'a URL with an IRI predicate parameter in angular brackets',
            'http://example.org/?predicate=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the predicate to the query',
            { a: 1 }, { a: 1, predicate: 'http://example.org/foo#bar' }
          ],
          [
            'a URL with a variable predicate parameter',
            'http://example.org/?predicate=%3Ffoo',
            'should not add the predicate to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with a blank predicate parameter',
            'http://example.org/?predicate=_:foo',
            'should not add the predicate to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with a literal predicate parameter',
            'http://example.org/?predicate=%22foo%22',
            'should not add the predicate to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with an empty object parameter',
            'http://example.org/?object=',
            'should not add the object to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with an IRI object parameter',
            'http://example.org/?object=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the object to the query',
            { a: 1 }, { a: 1, object: 'http://example.org/foo#bar' }
          ],
          [
            'a URL with an IRI object parameter in angular brackets',
            'http://example.org/?object=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the object to the query',
            { a: 1 }, { a: 1, object: 'http://example.org/foo#bar' }
          ],
          [
            'a URL with a variable object parameter',
            'http://example.org/?object=%3Ffoo',
            'should not add the object to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with a blank object parameter',
            'http://example.org/?object=_:foo',
            'should not add the object to the query',
            { a: 1 }, { a: 1 }
          ],
          [
            'a URL with a literal object parameter',
            'http://example.org/?object=%22foo%22',
            'should add the object to the query',
            { a: 1 }, { a: 1, object: '"foo"' }
          ],
          [
            'a URL with a language literal object parameter',
            'http://example.org/?object=%22foo%22@nl-be',
            'should add the object to the query',
            { a: 1 }, { a: 1, object: '"foo"@nl-be' }
          ],
          [
            'a URL with a typed literal object parameter',
            'http://example.org/?object=%22foo%22%5E%5Ehttp%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the object to the query',
            { a: 1 }, { a: 1, object: '"foo"^^http://example.org/foo#bar' }
          ],
          [
            'a URL with a typed literal object parameter in angular brackets',
            'http://example.org/?object=%22foo%22%5E%5E%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the object to the query',
            { a: 1 }, { a: 1, object: '"foo"^^http://example.org/foo#bar' }
          ],
        ]
        .forEach(function (args) { test.extractQueryParams.apply(router, args); });
      });
    });
  });
});
