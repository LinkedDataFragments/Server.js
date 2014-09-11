var LinkedDataFragmentsServer = require('../../lib/server/LinkedDataFragmentsServer');

var request = require('supertest');

describe('LinkedDataFragmentsServer', function () {
  describe('A LinkedDataFragmentsServer instance', function () {
    var server = new LinkedDataFragmentsServer(),
        client = request.agent(server);

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
  });
});
