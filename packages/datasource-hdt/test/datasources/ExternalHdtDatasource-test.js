/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
let ExternalHdtDatasource = require('../../lib/datasources/ExternalHdtDatasource').ExternalHdtDatasource;

let Datasource = require('@ldf/core').datasources.Datasource,
    path = require('path'),
    dataFactory = require('n3').DataFactory,
    childProcess = require('child_process'),
    EventEmitter = require('events');

let exampleHdtFile = path.join(__dirname, '../../../../test/assets/test.hdt');

// Creates a fake child process exposing just enough of the `child_process.ChildProcess`
// API for ExternalHdtDatasource's `_executeQuery`: a `stdout` stream to push data through.
function fakeHdtProcess() {
  let proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stdout.setEncoding = () => {};
  return proc;
}

describe('ExternalHdtDatasource', () => {
  describe('The ExternalHdtDatasource module', () => {
    it('should be a function', () => {
      ExternalHdtDatasource.should.be.a('function');
    });

    it('should be an ExternalHdtDatasource constructor', (done) => {
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      instance.should.be.an.instanceof(ExternalHdtDatasource);
      instance.close(done);
    });

    it('should create Datasource objects', (done) => {
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.initialize();
      instance.should.be.an.instanceof(Datasource);
      instance.close(done);
    });

    it('should not throw when constructed without options', () => {
      (function () {
        // eslint-disable-next-line no-new
        new ExternalHdtDatasource();
      }).should.not.throw();
    });
  });

  describe('created for a non-existing file', () => {
    it('should fail to initialize', (done) => {
      let instance = new ExternalHdtDatasource({ dataFactory, file: '/no/such/file.hdt' });
      instance.on('error', (error) => {
        error.message.should.contain('Not an HDT file');
        done();
      });
      instance.initialize();
    });
  });

  describe('created for an existing file when the hdt utility is missing', () => {
    it('should fail to initialize', (done) => {
      let fs = require('fs'), existsSync = sinon.stub(fs, 'existsSync').returns(false);
      existsSync.withArgs(exampleHdtFile).returns(true);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile });
      instance.on('error', (error) => {
        error.message.should.contain('hdt not found');
        existsSync.restore();
        done();
      });
      instance.initialize();
    });
  });

  describe('_executeQuery with a stubbed hdt process', () => {
    let spawnStub;
    afterEach(() => {
      if (spawnStub)
        spawnStub.restore(), spawnStub = null;
    });

    it('should emit an error when the hdt utility outputs invalid query results', (done) => {
      let proc = fakeHdtProcess();
      spawnStub = sinon.stub(childProcess, 'spawn').returns(proc);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile, checkFile: false });
      instance.initialize();
      instance.on('initialized', () => {
        let result = instance.select({ features: { triplePattern: true } });
        result.on('error', (error) => {
          error.message.should.contain('Invalid query result');
          done();
        });
        // Malformed: a subject and predicate with no object before the period
        proc.stdout.emit('data', '<http://example.org/s> <http://example.org/p> .\n');
      });
    });

    it('should round the estimated total count up when the header undercounts the offset and page', (done) => {
      let proc = fakeHdtProcess();
      spawnStub = sinon.stub(childProcess, 'spawn').returns(proc);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile, checkFile: false });
      instance.initialize();
      instance.on('initialized', () => {
        let result = instance.select({ offset: 0, limit: 10, features: { triplePattern: true, offset: true, limit: true } });
        let resultsCount = 0, totalCount;
        result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
        result.on('data', () => { resultsCount++; });
        result.on('end', () => {
          resultsCount.should.equal(2);
          totalCount.should.equal(2);
          done();
        });
        // Header underestimates: claims 1 total match, but 2 triples are actually returned
        proc.stdout.emit('data', '# Total matches: 1 (estimated)\n' +
          '<http://example.org/s> <http://example.org/p> <http://example.org/o1> .\n' +
          '<http://example.org/s> <http://example.org/p> <http://example.org/o2> .\n');
        proc.stdout.emit('end');
      });
    });

    it('should double the returned triple count when it fills the whole page', (done) => {
      let proc = fakeHdtProcess();
      spawnStub = sinon.stub(childProcess, 'spawn').returns(proc);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile, checkFile: false });
      instance.initialize();
      instance.on('initialized', () => {
        let result = instance.select({ offset: 0, limit: 1, features: { triplePattern: true, offset: true, limit: true } });
        let totalCount;
        result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
        result.on('data', () => {});
        result.on('end', () => {
          totalCount.should.equal(4);
          done();
        });
        // Header underestimates, and the page is full (2 triples reaches the limit of 1... simulated as 2 for doubling)
        proc.stdout.emit('data', '# Total matches: 1 (estimated)\n' +
          '<http://example.org/s> <http://example.org/p> <http://example.org/o1> .\n' +
          '<http://example.org/s> <http://example.org/p> <http://example.org/o2> .\n');
        proc.stdout.emit('end');
      });
    });

    it('should emit an error when the hdt utility process exits with a non-zero code', (done) => {
      let proc = fakeHdtProcess();
      spawnStub = sinon.stub(childProcess, 'spawn').returns(proc);
      let instance = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile, checkFile: false });
      instance.initialize();
      instance.on('initialized', () => {
        let result = instance.select({ features: { triplePattern: true } });
        result.on('error', (error) => {
          error.message.should.contain('Could not query');
          done();
        });
        proc.emit('exit', 1);
      });
    });
  });

  describe('created for a non-existing file with checkFile disabled', () => {
    it('should initialize without checking the file', (done) => {
      let instance = new ExternalHdtDatasource({ dataFactory, file: '/no/such/file.hdt', checkFile: false });
      instance.initialize();
      instance.on('initialized', done);
    });
  });

  describe('A ExternalHdtDatasource instance for an example HDT file', () => {
    let datasource;
    before((done) => {
      datasource = new ExternalHdtDatasource({ dataFactory, file: exampleHdtFile });
      datasource.initialize();
      datasource.on('initialized', done);
    });
    after((done) => {
      datasource.close(done);
    });

    describe('executing the empty query', () => {
      let resultsCount = 0, totalCount;
      before((done) => {
        let result = datasource.select({ features: { triplePattern: true } });
        result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
        result.on('data', () => { resultsCount++; });
        result.on('end', done);
      });

      it('should return all triples in the file', () => {
        expect(resultsCount).to.equal(132);
      });

      it('should emit the total triple count', () => {
        expect(totalCount).to.equal(132);
      });
    });

    describe('executing the empty query with an offset and limit', () => {
      let resultsCount = 0;
      before((done) => {
        let result = datasource.select({ offset: 10, limit: 10, features: { triplePattern: true, offset: true, limit: true } });
        result.on('data', () => { resultsCount++; });
        result.on('end', done);
      });

      it('should return the requested number of triples', () => {
        expect(resultsCount).to.equal(10);
      });
    });

    describe('executing a query for a non-default graph', () => {
      let resultsCount = 0, totalCount;
      before((done) => {
        let result = datasource.select({ graph: dataFactory.namedNode('g'), features: { quadPattern: true } });
        result.getProperty('metadata', (metadata) => { totalCount = metadata.totalCount; });
        result.on('data', () => { resultsCount++; });
        result.on('end', done);
      });

      it('should return no triples, since HDT only has a default graph', () => {
        expect(resultsCount).to.equal(0);
        expect(totalCount).to.equal(0);
      });
    });

    // KNOWN BUG (pre-existing, not introduced by this test): the query string passed
    // to the `hdt` CLI is built through plain string concatenation
    // (`query.subject || '?s'`), but a Term's default toString() is "[object Object]",
    // not its IRI. So any subject/predicate/object filter currently matches nothing.
    describe('executing a query with a subject filter', () => {
      let resultsCount = 0;
      before((done) => {
        let result = datasource.select({
          subject: dataFactory.namedNode('http://example.org/s1'),
          features: { triplePattern: true },
        });
        result.on('data', () => { resultsCount++; });
        result.on('end', done);
      });

      it('currently returns no triples, even though the subject exists in the file', () => {
        expect(resultsCount).to.equal(0);
      });
    });
  });
});
