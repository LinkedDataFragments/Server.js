var FragmentsHandler = require('../../lib/handlers/FragmentsHandler');

var request = require('supertest'),
    DummyServer = require('./DummyServer'),
    fs = require('fs'),
    http = require('http'),
    url = require('url');

describe('FragmentsHandler', function () {
  describe('A FragmentsHandler instance with 3 routers', function () {
    var handler, client, routerA, routerB, routerC, datasource, datasources, writer, prefixes;
    before(function () {
      routerA = { extractQueryParams: sinon.stub() };
      routerB = { extractQueryParams: sinon.stub().throws(new Error('second router error')) };
      routerC = { extractQueryParams: sinon.spy(function (request, query) {
        query.features.datasource = true;
        query.features.other = true;
        query.datasource = 'my-datasource';
        query.other = 'other';
      })};
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({ queryResult: true }),
      };
      datasources = { 'my-datasource': { title: 'My data', datasource: datasource } };
      writer = {
        writeFragment: sinon.spy(function (outputStream) { outputStream.end(); }),
        writeNotFound: sinon.spy(function (outputStream) { outputStream.end(); }),
      };
      prefixes = { a: 'a' };
      handler = new FragmentsHandler({
        routers: [ routerA, routerB, routerC ],
        datasources: datasources,
        writers: { '*/*': writer },
        prefixes: prefixes,
      });
      client = request.agent(new DummyServer(handler,
                             { baseURL: 'https://example.org/base/?bar=foo' }));
    });
    function resetAll() {
      routerA.extractQueryParams.reset();
      routerB.extractQueryParams.reset();
      routerC.extractQueryParams.reset();
      datasource.supportsQuery.reset();
      datasource.select.reset();
    }

    describe('receiving a request for a fragment', function () {
      var response;
      before(function (done) {
        resetAll();
        response = client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should call the first router with the request and an empty query', function () {
        routerA.extractQueryParams.should.have.been.calledOnce;

        var extractQueryParamsArgs = routerA.extractQueryParams.firstCall.args;
        extractQueryParamsArgs[0].should.have.property('url');
        extractQueryParamsArgs[0].url.should.have.property('path', '/my-datasource?a=b&c=d');
        extractQueryParamsArgs[0].url.should.have.property('pathname', '/my-datasource');
        extractQueryParamsArgs[0].url.should.have.property('query');
        extractQueryParamsArgs[0].url.query.should.deep.equal({ a: 'b', c: 'd' });

        extractQueryParamsArgs[1].should.be.an('object');
        extractQueryParamsArgs[1].should.have.property('features');
        extractQueryParamsArgs[1].features.should.be.an('array');
      });

      it('should call the second router with the same request and query', function () {
        routerB.extractQueryParams.should.have.been.calledOnce;

        routerB.extractQueryParams.firstCall.args[0].should.equal(
          routerA.extractQueryParams.firstCall.args[0]);
        routerB.extractQueryParams.firstCall.args[1].should.equal(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should call the third router with the same request and query', function () {
        routerC.extractQueryParams.should.have.been.calledOnce;

        routerC.extractQueryParams.firstCall.args[0].should.equal(
          routerA.extractQueryParams.firstCall.args[0]);
        routerC.extractQueryParams.firstCall.args[1].should.equal(
          routerA.extractQueryParams.firstCall.args[1]);
      });

      it('should verify whether the data source supports the query', function () {
        var query = routerC.extractQueryParams.firstCall.args[1];
        datasource.supportsQuery.should.have.been.calledOnce;
        datasource.supportsQuery.should.have.been.calledWith(query);
      });

      it('should send the query to the right data source', function () {
        var query = routerC.extractQueryParams.firstCall.args[1];
        datasource.select.should.have.been.calledOnce;
        datasource.select.should.have.been.calledWith(query);
      });

      it('should pass the query result to the output writer', function () {
        writer.writeFragment.should.have.been.calledOnce;
        var writeFragmentArgs = writer.writeFragment.firstCall.args;

        writeFragmentArgs[0].should.be.an.instanceof(http.ServerResponse); // where to write to
        writeFragmentArgs[1].should.deep.equal({ queryResult: true }); // what to write
        writeFragmentArgs[2].should.be.an('object'); // writing settings
      });

      it('should pass the correct settings to the output writer', function () {
        writer.writeFragment.should.have.been.calledOnce;
        var query = routerC.extractQueryParams.firstCall.args[1];
        var settings = writer.writeFragment.firstCall.args[2];

        settings.should.deep.equal({
          datasource: {
            title: 'My data',
            index: 'https://example.org/#dataset',
            url: 'https://example.org/my-datasource#dataset',
            templateUrl: 'https://example.org/my-datasource{?subject,predicate,object}',
          },
          fragment: {
            url:             'https://example.org/my-datasource?a=b&c=d',
            pageUrl:         'https://example.org/my-datasource?a=b&c=d',
            firstPageUrl:    'https://example.org/my-datasource?a=b&c=d&page=1',
            nextPageUrl:     'https://example.org/my-datasource?a=b&c=d&page=2',
            previousPageUrl: null
          },
          prefixes: prefixes,
          query: query,
          datasources: datasources,
        });
        query.should.have.property('patternString', '{ ?s ?p ?o }');
      });
    });

    describe('receiving a request for an unsupported fragment', function () {
      before(function (done) {
        resetAll();
        datasource.supportsQuery = sinon.stub().returns(false);
        client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should verify whether the data source supports the query', function () {
        var query = routerC.extractQueryParams.firstCall.args[1];
        datasource.supportsQuery.should.have.been.calledOnce;
        datasource.supportsQuery.should.have.been.calledWith(query);
      });

      it('should not send the query to the data source', function () {
        datasource.select.should.not.have.been.called;
      });
    });
  });

  describe('A FragmentsHandler instance with 3 writers', function () {
    var handler, client, writerHtml, writerJson, writerTurtle;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
      };
      var router = { extractQueryParams: function (request, query) {
        query.features.datasource = true;
        query.datasource = 'my-datasource';
      }};
      writerHtml   = { writeFragment: sinon.spy(function (stream) { stream.end(); }) };
      writerJson   = { writeFragment: sinon.spy(function (stream) { stream.end(); }) };
      writerTurtle = { writeFragment: sinon.spy(function (stream) { stream.end(); }) };
      handler = new FragmentsHandler({
        routers: [ router ],
        datasources: { 'my-datasource': { datasource: datasource } },
        writers: {
          'application/json': writerJson,
          'text/turtle,text/n3': writerTurtle,
          'text/html,*/*': writerHtml,
        },
      });
      client = request.agent(new DummyServer(handler));
    });
    function resetAll() {
      writerHtml.writeFragment.reset();
      writerJson.writeFragment.reset();
      writerTurtle.writeFragment.reset();
    }

    describe('receiving a request without Accept header', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/my-datasource')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the default writer', function () {
        writerHtml.writeFragment.should.have.been.calledOnce;
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of */*', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/my-datasource').set('Accept', '*/*')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the */* writer', function () {
        writerHtml.writeFragment.should.have.been.calledOnce;
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/html')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the HTML writer', function () {
        writerHtml.writeFragment.should.have.been.calledOnce;
      });

      it('should set the text/html content type', function () {
        response.headers.should.have.property('content-type', 'text/html;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of application/json', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/my-datasource').set('Accept', 'application/json')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the JSON writer', function () {
        writerJson.writeFragment.should.have.been.calledOnce;
      });

      it('should set the application/json content type', function () {
        response.headers.should.have.property('content-type', 'application/json;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/turtle', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/turtle')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the Turtle writer', function () {
        writerTurtle.writeFragment.should.have.been.calledOnce;
      });

      it('should set the text/turtle content type', function () {
        response.headers.should.have.property('content-type', 'text/turtle;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/n3', function () {
      var response;
      before(function (done) {
        resetAll();
        client.get('/my-datasource').set('Accept', 'text/n3')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should call the Turtle writer', function () {
        writerTurtle.writeFragment.should.have.been.calledOnce;
      });

      it('should set the text/n3 content type', function () {
        response.headers.should.have.property('content-type', 'text/n3;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });
  });

  describe('A FragmentsHandler instance without matching writer', function () {
    var handler, client;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
      };
      var router = { extractQueryParams: function (request, query) {
        query.features.datasource = true;
        query.datasource = 'my-datasource';
      }};
      handler = new FragmentsHandler({
        routers: [ router ],
        datasources: { 'my-datasource': { datasource: datasource } },
      });
      client = request.agent(new DummyServer(handler));
    });

    describe('receiving a request without Accept header', function () {
      var response;
      before(function (done) {
        client.get('/my-datasource')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should return status code 406', function () {
        response.should.have.property('statusCode', 406);
      });

      it('should set the text/plain content type', function () {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });

    describe('receiving a request with an Accept header of text/html', function () {
      var response;
      before(function (done) {
        client.get('/my-datasource').set('Accept', 'text/html')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should return status code 406', function () {
        response.should.have.property('statusCode', 406);
      });

      it('should set the text/plain content type', function () {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should indicate Accept in the Vary header', function () {
        response.headers.should.have.property('vary', 'Accept');
      });
    });
  });

  describe('A FragmentsHandler instance with a datasource that synchronously errors', function () {
    var handler, client, router, datasource, error, writer;
    before(function () {
      router = { extractQueryParams: sinon.spy(function (request, query) {
        query.features.datasource = true;
        query.datasource = 'my-datasource';
      })};
      error = new Error('datasource error'),
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().throws(error),
      };
      writer = {
        writeError: sinon.spy(function (outputStream) { outputStream.end(); }),
      };
      handler = new FragmentsHandler({
        routers: [ router ],
        datasources: { 'my-datasource': { datasource: datasource } },
        writers: { '*/*': writer },
      });
      client = request.agent(new DummyServer(handler));
    });
    function resetAll() {
      router.extractQueryParams.reset();
    }

    describe('receiving a request for a fragment', function () {
      var response;
      before(function (done) {
        resetAll();
        response = client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should pass the query error to the output writer', function () {
        writer.writeError.should.have.been.calledOnce;
        var writeErrorArgs = writer.writeError.firstCall.args;

        writeErrorArgs.should.have.length(3);
        writeErrorArgs[0].should.be.an.instanceof(http.ServerResponse);
        writeErrorArgs[1].should.equal(error);
        writeErrorArgs[2].should.be.an('object');
      });
    });
  });

  describe('A FragmentsHandler instance with a datasource that asynchronously errors', function () {
    var handler, client, router, datasource, error, writer;
    before(function () {
      router = { extractQueryParams: sinon.spy(function (request, query) {
        query.features.datasource = true;
        query.datasource = 'my-datasource';
      })};
      error = new Error('datasource error'),
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: function (query, callback) { setImmediate(callback.bind(null, error)); },
      };
      writer = {
        writeError: sinon.spy(function (outputStream) { outputStream.end(); }),
        writeFragment: sinon.stub(),
      };
      handler = new FragmentsHandler({
        routers: [ router ],
        datasources: { 'my-datasource': { datasource: datasource } },
        writers: { '*/*': writer },
      });
      client = request.agent(new DummyServer(handler));
    });
    function resetAll() {
      router.extractQueryParams.reset();
    }

    describe('receiving a request for a fragment', function () {
      var response;
      before(function (done) {
        resetAll();
        response = client.get('/my-datasource?a=b&c=d').end(done);
      });

      it('should pass the query error to the output writer', function () {
        writer.writeError.should.have.been.calledOnce;
        var writeErrorArgs = writer.writeError.firstCall.args;

        writeErrorArgs.should.have.length(3);
        writeErrorArgs[0].should.be.an.instanceof(http.ServerResponse);
        writeErrorArgs[1].should.equal(error);
        writeErrorArgs[2].should.be.an('object');
      });
    });
  });
});
