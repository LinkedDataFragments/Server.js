var LinkedDataFragmentsServer = require('../lib/LinkedDataFragmentsServer');

var request = require('supertest'),
    fs = require('fs'),
    http = require('http'),
    url = require('url');

describe('LinkedDataFragmentsServer', function () {
  describe('A LinkedDataFragmentsServer instance', function () {
    var server, client;
    before(function () {
      server = new LinkedDataFragmentsServer({
        log: function () {},
        writers: { '*/*': {
          writeNotFound: function (destination, settings) {
            destination.end(settings.url + ' not found');
          },
        }},
      });
      client = request.agent(server);
    });

    it('should send CORS headers', function (done) {
      client.head('/').expect(function (response) {
        response.headers.should.have.property('access-control-allow-origin', '*');
      }).end(done);
    });

    it('should not allow POST requests', function (done) {
      client.post('/').expect(function (response) {
        response.should.have.property('statusCode', 405);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', 'The HTTP method "POST" is not allowed; try "GET" instead.');
      }).end(done);
    });

    it('should not send a body with HEAD requests', function (done) {
      client.head('/').expect(function (response) {
        response.should.have.property('statusCode', 404);
        response.should.have.property('text', '');
      }).end(done);
    });

    it('should not send a body with OPTIONS requests', function (done) {
      client.options('/').expect(function (response) {
        response.should.have.property('statusCode', 404);
        response.should.have.property('text', '');
      }).end(done);
    });

    it('should send a 404 if a resource is not found', function (done) {
      client.get('/notfound').expect(function (response) {
        response.should.have.property('statusCode', 404);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', '/notfound not found');
      }).end(done);
    });

    it('should correctly serve SVG assets', function (done) {
      client.get('/assets/logo').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../assets/logo.svg', 'utf8');
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/svg+xml');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should correctly serve CSS assets', function (done) {
      client.get('/assets/style').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../assets/style.css', 'utf8');
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'text/css;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should correctly serve ICO assets', function (done) {
      client.get('/favicon.ico').expect(function (response) {
        var asset = fs.readFileSync(__dirname + '/../assets/favicon.ico', 'utf8');
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/x-icon');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should send a 404 if an asset is not found', function (done) {
      client.get('/assets/unknown').expect(function (response) {
        response.should.have.property('statusCode', 404);
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
        response.should.have.property('text', '/assets/unknown not found');
      }).end(done);
    });

    describe('when an internal error occurs', function (done) {
      before(function () {
        server._oldSendAsset = server._sendAsset;
        delete server._sendAsset;
      });
      after(function () {
        server._sendAsset = server._oldSendAsset;
        delete server._oldSendAsset;
      });

      it('should send a 500 error message', function (done) {
        client.get('/assets/logo', function (response) {
          response.should.have.property('statusCode', 500);
          response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
          response.should.have.property('text', 'A server error occurred.');
        }).end(done);
      });
    });
  });

  describe('A LinkedDataFragmentsServer instance with 3 routers', function () {
    var server, client, routerA, routerB, routerC, datasource, datasources, writer, prefixes;
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
      server = new LinkedDataFragmentsServer({
        routers: [ routerA, routerB, routerC ],
        datasources: datasources,
        writers: { '*/*': writer },
        prefixes: prefixes,
        baseURL: 'https://example.org/base/?bar=foo',
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

  describe('A LinkedDataFragmentsServer instance with 3 writers', function () {
    var server, client, writerHtml, writerJson, writerTurtle;
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
      server = new LinkedDataFragmentsServer({
        routers: [ router ],
        datasources: { 'my-datasource': { datasource: datasource } },
        writers: {
          'application/json': writerJson,
          'text/turtle,text/n3': writerTurtle,
          'text/html,*/*': writerHtml,
        },
      });
      client = request.agent(server);
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

  describe('A LinkedDataFragmentsServer instance without matching writer', function () {
    var server, client, writerHtml, writerJson, writerTurtle;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
      };
      var router = { extractQueryParams: function (request, query) {
        query.features.dataset = true;
        query.datasource = 'my-datasource';
      }};
      server = new LinkedDataFragmentsServer({
        log: function () {},
        routers: [ router ],
        datasources: { 'my-datasource': { datasource: datasource } },
      });
      client = request.agent(server);
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

  describe('A LinkedDataFragmentsServer instance with dereferencing', function () {
    var server, client, writerTurtle;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub(),
      };
      var router = { extractQueryParams: function (request, query) {
        query.features.datasource = true;
        query.datasource = request.url.pathname.substr(1);
      }};
      writerTurtle = { writeFragment: sinon.spy(function (stream) { stream.end(); }) };
      server = new LinkedDataFragmentsServer({
        datasources: { 'resource/datasource': { datasource: datasource } },
        dereference: { '/resource/': 'dbpedia' },
        writers: { 'text/turtle': writerTurtle },
        routers: [ router ],
      });
      client = request.agent(server);
    });

    describe('receiving a request for a dereferenced URL', function () {
      var response;
      before(function (done) {
        client.get('/resource/Mickey_Mouse')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should return status code 303', function () {
        response.should.have.property('statusCode', 303);
      });

      it('should set the text/plain content type', function () {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should set the Location header correctly', function () {
        var hostname = response.req.getHeader('Host'),
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia?subject=' + entityUrl;

        response.headers.should.have.property('location', expectedLocation);
      });

      it('should mention the desired location in the body', function () {
        var hostname = response.req.getHeader('Host'),
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia?subject=' + entityUrl;

        response.text.should.contain(expectedLocation);
      });
    });

    describe('receiving a request for a data source URL', function () {
      var response;
      before(function (done) {
        client.get('/resource/datasource')
              .end(function (error, res) { response = res; done(error); });
      });

      it('should not dereference', function () {
        response.should.have.property('statusCode', 200);
      });

      it('should call the Turtle writer', function () {
        writerTurtle.writeFragment.should.have.been.calledOnce;
      });

      it('should set the text/turtle content type', function () {
        response.headers.should.have.property('content-type', 'text/turtle;charset=utf-8');
      });
    });
  });
});
