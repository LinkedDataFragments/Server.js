/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
let IndexDatasource = require('../../lib/datasources/IndexDatasource');

let MemoryDatasource = require('../../lib/datasources/MemoryDatasource'),
    Datasource = require('../../lib/datasources/Datasource'),
    dataFactory = require('n3').DataFactory;

describe('IndexDatasource', () => {
  describe('The IndexDatasource module', () => {
    it('should be a function', () => {
      IndexDatasource.should.be.a('function');
    });

    it('should be an IndexDatasource constructor', () => {
      new IndexDatasource({ dataFactory }).should.be.an.instanceof(IndexDatasource);
    });

    it('should be a MemoryDatasource constructor', () => {
      new IndexDatasource({ dataFactory }).should.be.an.instanceof(MemoryDatasource);
    });

    it('should be a Datasource constructor', () => {
      new IndexDatasource({ dataFactory }).should.be.an.instanceof(Datasource);
    });
  });

  describe('An IndexDatasource instance', () => {
    it('should have role "index"', () => {
      new IndexDatasource({ dataFactory }).role.should.equal('index');
    });

    it('should not throw when no datasources option is given', () => {
      // eslint-disable-next-line no-new
      (function () { new IndexDatasource({ dataFactory }); }).should.not.throw();
    });
  });

  describe('An IndexDatasource instance without datasources', () => {
    let datasource = new IndexDatasource({ dataFactory });
    before((done) => { datasource.initialize(); datasource.on('initialized', done); });

    it('should return no quads', (done) => {
      let quads = [];
      datasource.select({ features: { triplePattern: true } })
        .on('data', (quad) => { quads.push(quad); })
        .on('end', () => { quads.should.have.length(0); done(); });
    });
  });

  describe('An IndexDatasource instance with datasources', () => {
    let datasources = {
      '/dataset-a': { url: 'http://example.org/dataset-a#dataset', title: 'Dataset A', description: 'The first dataset' },
      '/dataset-b': { url: 'http://example.org/dataset-b#dataset' },
      '/dataset-hidden': { url: 'http://example.org/dataset-hidden#dataset', hide: true, title: 'Hidden' },
      '/dataset-no-url': { title: 'No URL' },
      '/': { url: 'http://example.org/#dataset', title: 'Root index, should be excluded' },
    };
    let datasource = new IndexDatasource({ dataFactory, datasources });
    before((done) => { datasource.initialize(); datasource.on('initialized', done); });

    function selectAll(done, callback) {
      let quads = [];
      datasource.select({ features: { triplePattern: true } })
        .on('data', (quad) => { quads.push(quad); })
        .on('end', () => { callback(quads); done(); });
    }

    it('should describe a visible datasource with a title and description', (done) => {
      selectAll(done, (quads) => {
        let subject = dataFactory.namedNode('http://example.org/dataset-a#dataset');
        quads.filter((q) => q.subject.equals(subject)).should.have.length(4);
        quads.some((q) =>
          q.subject.equals(subject) &&
          q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
          q.object.value === 'http://rdfs.org/ns/void#Dataset').should.be.true;
        quads.some((q) =>
          q.subject.equals(subject) &&
          q.predicate.value === 'http://www.w3.org/2000/01/rdf-schema#label' &&
          q.object.value === 'Dataset A').should.be.true;
        quads.some((q) =>
          q.subject.equals(subject) &&
          q.predicate.value === 'http://purl.org/dc/terms/title' &&
          q.object.value === 'Dataset A').should.be.true;
        quads.some((q) =>
          q.subject.equals(subject) &&
          q.predicate.value === 'http://purl.org/dc/terms/description' &&
          q.object.value === 'The first dataset').should.be.true;
      });
    });

    it('should describe a visible datasource without a title or description with only its type', (done) => {
      selectAll(done, (quads) => {
        let subject = dataFactory.namedNode('http://example.org/dataset-b#dataset');
        quads.filter((q) => q.subject.equals(subject)).should.have.length(1);
        quads[quads.findIndex((q) => q.subject.equals(subject))].predicate.value
          .should.equal('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
      });
    });

    it('should not describe a hidden datasource', (done) => {
      selectAll(done, (quads) => {
        quads.some((q) => q.subject.value === 'http://example.org/dataset-hidden#dataset').should.be.false;
      });
    });

    it('should generate quads only for the visible datasources with a URL', (done) => {
      selectAll(done, (quads) => {
        // 4 for dataset-a + 1 for dataset-b; dataset-hidden, dataset-no-url, and / contribute none
        quads.should.have.length(5);
      });
    });

    it('should not describe the datasource registered at "/"', (done) => {
      selectAll(done, (quads) => {
        quads.some((q) => q.subject.value === 'http://example.org/#dataset').should.be.false;
      });
    });
  });
});
