/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let QuadPatternRouter = require('../../').routers.QuadPatternRouter;
const dataFactory = require('n3').DataFactory;

describe('QuadPatternRouter', () => {
  describe('The QuadPatternRouter module', () => {
    it('should be a function', () => {
      QuadPatternRouter.should.be.a('function');
    });

    it('should be a QuadPatternRouter constructor', () => {
      new QuadPatternRouter({}).should.be.an.instanceof(QuadPatternRouter);
    });
  });

  describe('A QuadPatternRouter instance', () => {
    let router = new QuadPatternRouter({ dataFactory });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should not change the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an empty subject parameter',
            'http://example.org/?subject=',
            'should not add the subject to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an IRI subject parameter',
            'http://example.org/?subject=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the subject to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with an IRI subject parameter in angular brackets',
            'http://example.org/?subject=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the subject to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a variable subject parameter',
            'http://example.org/?subject=%3Ffoo',
            'should not add the subject to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a blank subject parameter',
            'http://example.org/?subject=_:foo',
            'should not add the subject to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a literal subject parameter',
            'http://example.org/?subject=%22foo%22',
            'should not add the subject to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an empty predicate parameter',
            'http://example.org/?predicate=',
            'should not add the predicate to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an IRI predicate parameter',
            'http://example.org/?predicate=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the predicate to the query',
            { a: 1, features: { a: true } },
            { a: 1, features: { a: true, triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with an IRI predicate parameter in angular brackets',
            'http://example.org/?predicate=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the predicate to the query',
            { a: 1, features: { a: true } },
            { a: 1, features: { a: true, triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a variable predicate parameter',
            'http://example.org/?predicate=%3Ffoo',
            'should not add the predicate to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a blank predicate parameter',
            'http://example.org/?predicate=_:foo',
            'should not add the predicate to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a literal predicate parameter',
            'http://example.org/?predicate=%22foo%22',
            'should not add the predicate to the query',
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
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with an IRI object parameter in angular brackets',
            'http://example.org/?object=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a variable object parameter',
            'http://example.org/?object=%3Ffoo',
            'should not add the object to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a blank object parameter',
            'http://example.org/?object=_:foo',
            'should not add the object to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a literal object parameter',
            'http://example.org/?object=%22foo%22',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo') },
          ],
          [
            'a URL with a language literal object parameter',
            'http://example.org/?object=%22foo%22@nl-be',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', 'nl-be') },
          ],
          [
            'a URL with a typed literal object parameter',
            'http://example.org/?object=%22foo%22%5E%5Ehttp%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) },
          ],
          [
            'a URL with a typed literal object parameter in angular brackets',
            'http://example.org/?object=%22foo%22%5E%5E%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) },
          ],
          [
            'a URL with an empty graph parameter',
            'http://example.org/?graph=',
            'should not add the graph to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an IRI graph parameter',
            'http://example.org/?graph=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with an IRI graph parameter in angular brackets',
            'http://example.org/?graph=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a variable graph parameter',
            'http://example.org/?graph=%3Ffoo',
            'should not add the graph to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a blank graph parameter',
            'http://example.org/?graph=_:foo',
            'should not add the graph to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with a literal graph parameter',
            'http://example.org/?graph=%22foo%22',
            'should not add the graph to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'the default graph as graph parameter',
            'http://example.org/?graph=urn%3Aldf%3AdefaultGraph',
            'should add the default graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.defaultGraph() },
          ],
        ]
          .forEach((args) => { test.extractQueryParams.apply(router, args); });
      });
    });
  });

  describe('A QuadPatternRouter instance with prefixes', () => {
    let router = new QuadPatternRouter({
      prefixes: {
        foo:  'http://example.org/foo#',
        http: 'http://www.w3.org/2011/http#',
      },
      dataFactory,
    });

    describe('extractUrlParams', () => {
      describe('with an existing query', () => {
        [
          [
            'a URL without query parameters',
            'http://example.org/',
            'should not change the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an empty subject parameter',
            'http://example.org/?subject=',
            'should not add the subject to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an IRI subject parameter',
            'http://example.org/?subject=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the subject to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name subject parameter',
            'http://example.org/?subject=foo%3Abar',
            'should add the expanded subject to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name subject parameter with the "http" prefix',
            'http://example.org/?subject=http%3AConnection',
            'should add the expanded subject to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://www.w3.org/2011/http#Connection') },
          ],
          [
            'a URL with a prefixed name subject parameter with an unknown prefix',
            'http://example.org/?subject=bar%3Afoo',
            'should add the non-expanded subject to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('bar:foo') },
          ],
          [
            'a URL with an IRI subject parameter in angular brackets',
            'http://example.org/?subject=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the non-expanded subject to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name subject parameter in angular brackets',
            'http://example.org/?subject=%3Cfoo%3Abar%3E',
            'should add the non-expanded subject to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, subject: dataFactory.namedNode('foo:bar') },
          ],
          [
            'a URL with an empty predicate parameter',
            'http://example.org/?predicate=',
            'should not add the predicate to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an IRI predicate parameter',
            'http://example.org/?predicate=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the predicate to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name predicate parameter',
            'http://example.org/?predicate=foo%3Abar',
            'should add the expanded predicate to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name predicate parameter with the "http" prefix',
            'http://example.org/?predicate=http%3Aauthority',
            'should add the expanded predicate to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('http://www.w3.org/2011/http#authority') },
          ],
          [
            'a URL with a prefixed name predicate parameter with an unknown prefix',
            'http://example.org/?predicate=bar%3Afoo',
            'should add the non-expanded predicate to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('bar:foo') },
          ],
          [
            'a URL with an IRI predicate parameter in angular brackets',
            'http://example.org/?predicate=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the non-expanded predicate to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name predicate parameter in angular brackets',
            'http://example.org/?predicate=%3Cfoo%3Abar%3E',
            'should add the non-expanded predicate to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, predicate: dataFactory.namedNode('foo:bar') },
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
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name object parameter',
            'http://example.org/?object=foo%3Abar',
            'should add the expanded object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name object parameter with the "http" prefix',
            'http://example.org/?object=http%3AConnection',
            'should add the expanded object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://www.w3.org/2011/http#Connection') },
          ],
          [
            'a URL with a prefixed name object parameter with an unknown prefix',
            'http://example.org/?object=bar%3Afoo',
            'should add the non-expanded object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('bar:foo') },
          ],
          [
            'a URL with an IRI object parameter in angular brackets',
            'http://example.org/?object=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the non-expanded object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name object parameter in angular brackets',
            'http://example.org/?object=%3Cfoo%3Abar%3E',
            'should add the non-expanded object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.namedNode('foo:bar') },
          ],
          [
            'a URL with a typed literal object parameter',
            'http://example.org/?object=%22foo%22%5E%5Ehttp%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) },
          ],
          [
            'a URL with a typed literal object parameter in angular brackets',
            'http://example.org/?object=%22foo%22%5E%5E%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) },
          ],
          [
            'a URL with a prefixed literal object parameter',
            'http://example.org/?object=%22foo%22%5E%5Efoo%3Abar',
            'should add the object to the query',
            { a: 1 },
            { a: 1, features: { triplePattern: true }, object: dataFactory.literal('foo', dataFactory.namedNode('http://example.org/foo#bar')) },
          ],
          [
            'a URL with an empty graph parameter',
            'http://example.org/?graph=',
            'should not add the graph to the query',
            { a: 1 },
            { a: 1 },
          ],
          [
            'a URL with an IRI graph parameter',
            'http://example.org/?graph=http%3A%2F%2Fexample.org%2Ffoo%23bar',
            'should add the graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name graph parameter',
            'http://example.org/?graph=foo%3Abar',
            'should add the expanded graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name graph parameter with the "http" prefix',
            'http://example.org/?graph=http%3AConnection',
            'should add the expanded graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://www.w3.org/2011/http#Connection') },
          ],
          [
            'a URL with a prefixed name graph parameter with an unknown prefix',
            'http://example.org/?graph=bar%3Afoo',
            'should add the non-expanded graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('bar:foo') },
          ],
          [
            'a URL with an IRI graph parameter in angular brackets',
            'http://example.org/?graph=%3Chttp%3A%2F%2Fexample.org%2Ffoo%23bar%3E',
            'should add the non-expanded graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('http://example.org/foo#bar') },
          ],
          [
            'a URL with a prefixed name graph parameter in angular brackets',
            'http://example.org/?graph=%3Cfoo%3Abar%3E',
            'should add the non-expanded graph to the query',
            { a: 1 },
            { a: 1, features: { quadPattern: true }, graph: dataFactory.namedNode('foo:bar') },
          ],
        ]
          .forEach((args) => { test.extractQueryParams.apply(router, args); });
      });
    });
  });
});
