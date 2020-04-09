/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let CompositeDatasource = require('../../').datasources.CompositeDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    HdtDatasource = require('@ldf/datasource-hdt').datasources.HdtDatasource,
    N3Datasource = require('@ldf/datasource-n3').datasources.N3Datasource,
    path = require('path'),
    dataFactory = require('n3').DataFactory;

let exampleHdtFile = path.join(__dirname, '../../../../test/assets/test.hdt');
let exampleHdtFileWithBlanks = path.join(__dirname, '../../../../test/assets/test-blank.hdt');
let exampleTurtleUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.ttl');
let exampleTrigUrl = 'file://' + path.join(__dirname, '../../../../test/assets/test.trig');

describe('CompositeDatasource', () => {
  let references = {
    data0: { dataFactory, settings: { dataFactory, file: exampleHdtFile }, datasourceType: HdtDatasource, size: 132 },
    data1: { dataFactory, settings: { dataFactory, file: exampleHdtFileWithBlanks, graph: 'http://example.org/graph0' }, datasourceType: HdtDatasource, size: 6 },
    data2: { dataFactory, settings: { dataFactory, url: exampleTurtleUrl }, datasourceType: N3Datasource, size: 129 },
    data3: { dataFactory, settings: { dataFactory, url: exampleTrigUrl }, datasourceType: N3Datasource, size: 7 },
  };
  Object.keys(references).forEach((datasourceId) => {
    let datasource = references[datasourceId];
    let DatasourceType = datasource.datasourceType;
    let size = references[datasourceId].size;
    references[datasourceId] = new DatasourceType(datasource.settings);
    references[datasourceId].size = size;
    references[datasourceId].initialize();
  });
  let totalSize = Object.keys(references).reduce((acc, key) => {
    return acc + references[key].size;
  }, 0);

  describe('The CompositeDatasource module', () => {
    it('should be a function', () => {
      CompositeDatasource.should.be.a('function');
    });

    it('should be an CompositeDatasource constructor', (done) => {
      let instance = new CompositeDatasource({ references: references });
      instance.should.be.an.instanceof(CompositeDatasource);
      instance.close(done);
    });

    it('should create CompositeDatasource objects', (done) => {
      let instance = new CompositeDatasource({ references: references });
      instance.should.be.an.instanceof(CompositeDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', (done) => {
      let instance = new CompositeDatasource({ references: references });
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });
  });

  describe('A CompositeDatasource instance for 4 Datasources', () => {
    let datasource;
    function getDatasource() { return datasource; }
    before((done) => {
      datasource = new CompositeDatasource({ references: references });
      datasource.initialize();
      datasource.on('initialized', done);
    });
    after((done) => {
      datasource.close(done);
    });

    itShouldExecute(getDatasource,
      'the empty query',
      { features: { triplePattern: true } },
      totalSize, totalSize);

    itShouldExecute(getDatasource,
      'the empty quad query',
      { features: { quadPattern: true } },
      totalSize, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with a limit',
      { limit: 10, features: { triplePattern: true, limit: true } },
      10, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 10',
      { offset: 10, features: { triplePattern: true, offset: true } },
      totalSize - 10, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 100',
      { offset: 100, features: { triplePattern: true, offset: true } },
      totalSize - 100, totalSize);

    itShouldExecute(getDatasource,
      'the empty query with an offset of 200',
      { offset: 200, features: { triplePattern: true, offset: true } },
      totalSize - 200, totalSize);

    itShouldExecute(getDatasource,
      'a query for an existing subject',
      { subject: dataFactory.namedNode('http://example.org/s1'),   limit: 10, features: { triplePattern: true, limit: true } },
      10, 200);

    itShouldExecute(getDatasource,
      'a query for a non-existing subject',
      { subject: dataFactory.namedNode('http://example.org/p1'),   limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/p1'), limit: 10, features: { triplePattern: true, limit: true } },
      10, 220);

    itShouldExecute(getDatasource,
      'a query for a non-existing predicate',
      { predicate: dataFactory.namedNode('http://example.org/s1'), limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing object',
      { object: dataFactory.namedNode('http://example.org/o001'),  limit: 10, features: { triplePattern: true, limit: true } },
      6, 6);

    itShouldExecute(getDatasource,
      'a query for a non-existing object',
      { object: dataFactory.namedNode('http://example.org/s1'),    limit: 10, features: { triplePattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for an existing graph',
      { graph: dataFactory.namedNode('http://example.org/bob'),    limit: 10, features: { quadPattern: true, limit: true } },
      3, 3);

    itShouldExecute(getDatasource,
      'a query for a non-existing graph',
      { graph: dataFactory.namedNode('http://example.org/notbob'), limit: 10, features: { quadPattern: true, limit: true } },
      0, 0);

    itShouldExecute(getDatasource,
      'a query for the default graph',
      { graph: dataFactory.defaultGraph(),                          limit: 10, features: { quadPattern: true, limit: true } },
      10, 263);

    itShouldExecute(getDatasource,
      'a query for the default graph without a limit',
      { graph: dataFactory.defaultGraph(),                          features: { quadPattern: true, limit: true } },
      263, 263);

    itShouldExecute(getDatasource,
      'a query for graph0',
      { graph: dataFactory.namedNode('http://example.org/graph0'), limit: 10, features: { quadPattern: true, limit: true } },
      6, 6);
  });
});

function itShouldExecute(getDatasource, name, query,
  expectedResultsCount, expectedTotalCount, expectedTriples) {
  describe('executing ' + name, () => {
    let resultsCount = 0, totalCount, triples = [];
    before((done) => {
      let result = getDatasource().select(query);
      result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
      result.on('data', (triple) => { resultsCount++; expectedTriples && triples.push(triple); });
      result.on('end', done);
    });

    it('should return the expected number of triples', () => {
      expect(resultsCount).to.equal(expectedResultsCount);
    });

    it('should emit the expected total number of triples', () => {
      expect(totalCount).to.equal(expectedTotalCount);
    });

    if (expectedTriples) {
      it('should emit the expected triples', () => {
        expect(triples.length).to.equal(expectedTriples.length);
        for (let i = 0; i < expectedTriples.length; i++)
          triples[i].should.deep.equal(expectedTriples[i]);
      });
    }
  });
}
