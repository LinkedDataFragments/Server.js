var LinkedDataFragmentsServer = require('../../lib/server/LinkedDataFragmentsServer');

var request = require('supertest'),
    fs = require('fs'),
    http = require('http'),
    url = require('url');

describe('LinkedDataFragmentsServer', function () {
  describe('A LinkedDataFragmentsServer instance', function () {
    var server, client;
    before(function () {
      server = new LinkedDataFragmentsServer();
      client = request.agent(server);
    });

    it('should not allow POST requests', function (done) {
      client.post('/').expect(function (response) {
        response.should.have.property('statusCode', 405);
        response.headers.should.have.property('content-type', 'text/plain');
        response.should.have.property('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
      }).end(done);
    });

    it('should not send a body with HEAD requests', function (done) {
      client.head('/').expect(function (response) {
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', '');
      }).end(done);
    });

    it('should not send a body with OPTIONS requests', function (done) {
      client.options('/').expect(function (response) {
        response.should.have.property('statusCode', 200);
        response.should.have.property('text', '');
      }).end(done);
    });

    it('should send a 404 if a resource is not found', function (done) {
      client.get('/notfound').expect(function (response) {
        response.should.have.property('statusCode', 404);
        response.headers.should.have.property('content-type', 'text/plain');
        response.should.have.property('text', 'The resource with URL "/notfound" was not found.');
      }).end(done);
    });

    it('should correctly serve SVG assets', function (done) {
      client.get('/assets/logo').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../../assets/logo.svg', 'utf8');
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/svg+xml');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should correctly serve CSS assets', function (done) {
      client.get('/assets/style').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../../assets/style.css', 'utf8');
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'text/css');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should correctly serve ICO assets', function (done) {
      client.get('/favicon.ico').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../../assets/favicon.ico', 'utf8');
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/x-icon');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should send a 404 if an asset is not found', function (done) {
      client.get('/assets/unknown').expect(function (response) {
        response.should.have.property('statusCode', 404);
        response.headers.should.have.property('content-type', 'text/plain');
        response.should.have.property('text', 'The resource with URL "/assets/unknown" was not found.');
      }).end(done);
    });
  });

  describe('A LinkedDataFragmentsServer instance with 3 routers', function () {
    var server, client, routerA, routerB, routerC, datasource, writer;
    before(function () {
      routerA = { extractQueryParams: sinon.stub() };
      routerB = { extractQueryParams: sinon.stub().throws(new Error('second router error')) };
      routerC = { extractQueryParams: sinon.spy(function (request, query) {
        query.features.dataset = true;
        query.features.other = true;
        query.datasource = 'my-datasource';
        query.other = 'other';
      })};
      datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({ queryResult: true }),
      };
      writer = {
        writeFragment: sinon.spy(function (outputStream, tripleStream, options) {
          outputStream.end();
        }),
      };
      server = new LinkedDataFragmentsServer({
        fragmentRouters: [ routerA, routerB, routerC ],
        datasources: { 'my-datasource': datasource },
        writers: { '*/*': writer },
      });
      client = request.agent(server);
    });
    function resetAll() {
      routerA.extractQueryParams.reset();
      routerB.extractQueryParams.reset();
      routerC.extractQueryParams.reset();
      datasource.supportsQuery.reset();
      datasource.select.reset();
    }

    describe('receiving a request for a fragment', function () {
      before(function (done) {
        resetAll();
        client.get('/my-datasource?a=b&c=d').end(done);
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
        var writeFragmentArgs = writer.writeFragment.firstCall.args;

        writeFragmentArgs[2].should.have.property('datasource');
        writeFragmentArgs[2].datasource.should.have.property('name', 'my-datasource');
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
});
