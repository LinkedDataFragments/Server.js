/*! @license MIT ©2013-2016 Ruben Verborgh, Ghent University - imec */
const Datasource = require('../../lib/datasources/Datasource');

const EventEmitter = require('events'),
    fs = require('fs'),
    path = require('path'),
    N3 = require('n3');

const exampleFile = path.join(__dirname, '../../../../test/assets/test.ttl');
const dataFactory = N3.DataFactory;

describe('Datasource', () => {
  describe('The Datasource module', () => {
    it('should be a function', () => {
      Datasource.should.be.a('function');
    });

    it('should be a Datasource constructor', () => {
      new Datasource({ dataFactory }).should.be.an.instanceof(Datasource);
    });

    it('should be an EventEmitter constructor', () => {
      new Datasource({ dataFactory }).should.be.an.instanceof(EventEmitter);
    });
  });

  describe('A Datasource instance', () => {
    let datasource = new Datasource({ dataFactory });
    datasource.initialize();

    it('should not indicate support for any features', () => {
      datasource.supportedFeatures.should.deep.equal({});
    });

    it('should not support the empty query', () => {
      datasource.supportsQuery({}).should.be.false;
    });

    it('should not support a query with features', () => {
      datasource.supportsQuery({ features: { a: true, b: true } }).should.be.false;
    });

    it('should throw an error when trying to execute an unsupported query', (done) => {
      datasource.select({ features: { a: true, b: true } }, (error) => {
        error.should.be.an.instanceOf(Error);
        error.should.have.property('message', 'The datasource does not support the given query');
        done();
      });
    });

    it('should throw an error when trying to execute a supported query', () => {
      (function () { datasource.select({ features: {} }); })
        .should.throw('_executeQuery has not been implemented');
    });

    describe('fetching a resource', () => {
      it('fetches an existing resource', (done) => {
        let result = datasource._fetch({ url: 'file://' + exampleFile }), buffer = '';
        result.on('data', (d) => { buffer += d; });
        result.on('end', () => {
          buffer.should.equal(fs.readFileSync(exampleFile, 'utf8'));
          done();
        });
        result.on('error', done);
      });

      it('assumes file:// as the default protocol', (done) => {
        let result = datasource._fetch({ url: exampleFile }), buffer = '';
        result.on('data', (d) => { buffer += d; });
        result.on('end', () => {
          buffer.should.equal(fs.readFileSync(exampleFile, 'utf8'));
          done();
        });
        result.on('error', done);
      });

      it('emits an error when the protocol is unknown', (done) => {
        let result = datasource._fetch({ url: 'myprotocol:abc' });
        result.on('error', (error) => {
          error.message.should.contain('Unknown protocol: myprotocol');
          done();
        });
      });

      it('emits an error on the datasource when no error listener is attached to the result', (done) => {
        let result = datasource._fetch({ url: exampleFile + 'notfound' });
        result.on('data', done);
        datasource.on('error', (error) => {
          error.message.should.contain('ENOENT: no such file or directory');
          done();
        });
      });

      it('does not emit an error on the datasource when an error listener is attached to the result', (done) => {
        let result = datasource._fetch({ url: exampleFile + 'notfound' });
        result.on('error', (error) => {
          error.message.should.contain('ENOENT: no such file or directory');
          done();
        });
        datasource.on('error', (error) => {
          done(error);
        });
      });
    });

    describe('when closed without a callback', () => {
      it('should do nothing', () => {
        datasource.close();
      });
    });

    describe('when closed with a callback', () => {
      it('should invoke the callback', (done) => {
        datasource.close(done);
      });
    });
  });

  describe('A Datasource instance with an initializer', () => {
    let datasource, initializedListener, errorListener, initResolver, initSpy;
    before(() => {
      datasource = new Datasource({ dataFactory });
      datasource._initialize = () => new Promise((resolve) => initResolver = resolve);
      initSpy = sinon.spy(datasource, '_initialize');
      Object.defineProperty(datasource, 'supportedFeatures', {
        value: { all: true },
      });
      datasource.on('initialized', initializedListener = sinon.stub());
      datasource.on('error', errorListener = sinon.stub());
      datasource.initialize();
    });

    describe('after construction', () => {
      it('should have called the initializer', () => {
        initSpy.should.have.been.calledOnce;
      });

      it('should not be initialized', () => {
        datasource.initialized.should.be.false;
      });

      it('should not support any query', () => {
        datasource.supportsQuery({}).should.be.false;
      });

      it('should error when trying to query', (done) => {
        datasource.select({}, (error) => {
          error.should.have.property('message', 'The datasource is not initialized yet');
          done();
        });
      });
    });

    describe('after the initializer calls the callback', () => {
      before(() => {
        initResolver();
      });

      it('should be initialized', () => {
        datasource.initialized.should.be.true;
      });

      it('should have called "initialized" listeners', () => {
        initializedListener.should.have.been.calledOnce;
      });

      it('should not have called "error" listeners', () => {
        errorListener.should.not.have.been.called;
      });

      it('should support queries', () => {
        datasource.supportsQuery({}).should.be.true;
      });

      it('should allow querying', (done) => {
        datasource.select({}, (error) => {
          error.should.have.property('message', '_executeQuery has not been implemented');
          done();
        });
      });
    });
  });

  describe('A Datasource instance with an initializer that errors synchronously', () => {
    let datasource, initializedListener, errorListener, error;
    before(() => {
      datasource = new Datasource({ dataFactory });
      error = new Error('initializer error');
      datasource._initialize = () => { throw error; };
      sinon.spy(datasource, '_initialize');
      datasource.on('initialized', initializedListener = sinon.stub());
      datasource.on('error', errorListener = sinon.stub());
      datasource.initialize();
    });

    describe('after the initializer calls the callback', () => {
      it('should have called the initializer', () => {
        datasource._initialize.should.have.been.calledOnce;
      });

      it('should not be initialized', () => {
        datasource.initialized.should.be.false;
      });

      it('should not have called "initialized" listeners', () => {
        initializedListener.should.not.have.been.called;
      });

      it('should not have called "error" listeners', () => {
        errorListener.should.have.been.calledOnce;
        errorListener.should.have.been.calledWith(error);
      });
    });
  });

  describe('A Datasource instance with an initializer that errors asynchronously', () => {
    let datasource, initializedListener, errorListener, error;
    before(() => {
      datasource = new Datasource({ dataFactory });
      error = new Error('initializer error');
      datasource._initialize = () => Promise.reject(error);
      sinon.spy(datasource, '_initialize');
      datasource.on('initialized', initializedListener = sinon.stub());
      datasource.on('error', errorListener = sinon.stub());
      datasource.initialize();
    });

    describe('after the initializer calls the callback', () => {
      it('should have called the initializer', () => {
        datasource._initialize.should.have.been.calledOnce;
      });

      it('should not be initialized', () => {
        datasource.initialized.should.be.false;
      });

      it('should not have called "initialized" listeners', () => {
        initializedListener.should.not.have.been.called;
      });

      it('should not have called "error" listeners', () => {
        errorListener.should.have.been.calledOnce;
        errorListener.should.have.been.calledWith(error);
      });
    });
  });

  describe('A derived Datasource instance', () => {
    let datasource = new Datasource({ dataFactory });
    Object.defineProperty(datasource, 'supportedFeatures', {
      enumerable: true,
      value: { a: true, b: true, c: false },
    });
    datasource._executeQuery = sinon.stub();
    datasource.initialize();

    it('should support the empty query', () => {
      datasource.supportsQuery({}).should.be.true;
    });

    it('should support queries with supported features', () => {
      datasource.supportsQuery({ features: {} }).should.be.true;
      datasource.supportsQuery({ features: { a: true } }).should.be.true;
      datasource.supportsQuery({ features: { a: true, b: true } }).should.be.true;
      datasource.supportsQuery({ features: { b: true } }).should.be.true;
      datasource.supportsQuery({ features: { a: false, b: true } }).should.be.true;
      datasource.supportsQuery({ features: { a: true, b: false } }).should.be.true;
      datasource.supportsQuery({ features: { a: true, b: true, c: false } }).should.be.true;
    });

    it('should not support queries with unsupported features', () => {
      datasource.supportsQuery({ features: { c: true } }).should.be.false;
      datasource.supportsQuery({ features: { a: true, c: true } }).should.be.false;
      datasource.supportsQuery({ features: { b: true, c: true } }).should.be.false;
      datasource.supportsQuery({ features: { a: true, b: true, c: true } }).should.be.false;
    });

    it('should not attach an error listener on select if none was passed', () => {
      let result = datasource.select({ features: {} });
      (function () { result.emit('error', new Error()); }).should.throw();
    });

    it('should attach an error listener on select if one was passed', () => {
      let onError = sinon.stub(), error = new Error();
      let result = datasource.select({ features: {} }, onError);
      result.emit('error', error);
      onError.should.have.been.calledOnce;
      onError.should.have.been.calledWith(error);
    });
  });

  describe('A Datasource instance with a graph property', () => {
    let datasource = new Datasource({
      dataFactory,
      graph: 'http://example.org/#mygraph',
    });
    Object.defineProperty(datasource, 'supportedFeatures', {
      enumerable: true,
      value: { custom: true },
    });
    datasource.initialize();
    datasource._executeQuery = sinon.spy((query, destination) => {
      destination._push({ subject: dataFactory.namedNode('s'), predicate: dataFactory.namedNode('p'), object: dataFactory.namedNode('o1') });
      destination._push({ subject: dataFactory.namedNode('s'), predicate: dataFactory.namedNode('p'), object: dataFactory.namedNode('o2'), graph: dataFactory.defaultGraph() });
      destination._push({ subject: dataFactory.namedNode('s'), predicate: dataFactory.namedNode('p'), object: dataFactory.namedNode('o3'), graph: dataFactory.namedNode('g') });
      destination.close();
    });

    beforeEach(() => {
      datasource._executeQuery.reset();
    });

    it('should move triples in the default graph to the given graph', (done) => {
      let result = datasource.select({ features: { custom: true } }, done), quads = [];
      result.on('data', (q) => { quads.push(q); });
      result.on('end', () => {
        let matchingquads = [{ subject: dataFactory.namedNode('s'), predicate: dataFactory.namedNode('p'), object: dataFactory.namedNode('o1'), graph: dataFactory.namedNode('http://example.org/#mygraph') },
          { subject: dataFactory.namedNode('s'), predicate: dataFactory.namedNode('p'), object: dataFactory.namedNode('o2'), graph: dataFactory.namedNode('http://example.org/#mygraph') },
          { subject: dataFactory.namedNode('s'), predicate: dataFactory.namedNode('p'), object: dataFactory.namedNode('o3'), graph: dataFactory.namedNode('g') }];
        matchingquads.length.should.be.equal(quads.length);
        for (let i = 0; i < quads.length; i++)
          matchingquads[i].should.deep.equal(quads[i]);
        done();
      });
    });

    it('should query the given graph as the default graph', () => {
      datasource.select({
        graph: dataFactory.namedNode('http://example.org/#mygraph'),
        features: { custom: true },
      });
      datasource._executeQuery.args[0][0].features.should.deep.equal({ custom: true }),
      datasource._executeQuery.args[0][0].graph.equals(dataFactory.defaultGraph());
    });

    it('should query the default graph as the empty graph', () => {
      datasource.select({
        graph: dataFactory.defaultGraph(),
        features: { custom: true },
      });
      datasource._executeQuery.args[0][0].features.should.deep.equal({ custom: true }),
      datasource._executeQuery.args[0][0].graph.equals(dataFactory.namedNode('urn:ldf:emptyGraph'));
    });
  });
});
