var LinkedDataFragmentsServer = require('../../lib/server/LinkedDataFragmentsServer');

var request = require('supertest'),
    fs = require('fs'),
    url = require('url');

describe('LinkedDataFragmentsServer', function () {
  describe('A LinkedDataFragmentsServer instance', function () {
    var server = new LinkedDataFragmentsServer();
    var client = request.agent(server);

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
    var routerA = {}, routerB = {}, routerC = {};
    var server = new LinkedDataFragmentsServer({
      fragmentRouters: [ routerA, routerB, routerC ],
    });
    var client = request.agent(server);

    it('should call each of the routers in sequence, ignoring errors', function (done) {
      var finalQuery;
      routerA.extractQueryParams = function (request, query) {
        request.url.pathname.should.equal('/dataset');
        request.url.query.should.deep.equal({ a: 'b', c: 'd' });
        query.features.push('a');
      };
      routerB.extractQueryParams = function (request, query) {
        request.url.pathname.should.equal('/dataset');
        request.url.query.should.deep.equal({ a: 'b', c: 'd' });
        query.features.push('b');
        throw new Error('extraction error');
      };
      routerC.extractQueryParams = function (request, query) {
        request.url.pathname.should.equal('/dataset');
        request.url.query.should.deep.equal({ a: 'b', c: 'd' });
        query.features.push('c');
        finalQuery = query;
      };

      client.get('/dataset?a=b&c=d').expect(function (response) {
        finalQuery.should.deep.equal({ features: [ 'a', 'b', 'c' ] });
      }).end(done);
    });
  });
});
