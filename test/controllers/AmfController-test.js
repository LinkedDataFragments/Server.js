var AmfController = require('../../lib/controllers/AmfController');

var request = require('supertest'),
    DummyServer = require('./DummyServer');

var AmfRdfView = require('../../lib/views/Amf/AmfRdfView.js');

describe('AmfController', function () {
  describe('The AmfController module', function () {
    it('should be a function', function () {
      AmfController.should.be.a('function');
    });

    it('should be an AmfController constructor', function () {
      new AmfController().should.be.an.instanceof(AmfController);
    });

    it('should create new AmfController objects', function () {
      AmfController().should.be.an.instanceof(AmfController);
    });
  });

  describe('An AmfController instance', function () {
    var controller, client;
    before(function () {
      var datasource = {
        supportsQuery: sinon.stub().returns(true),
        select: sinon.stub().returns({
          on: function (event, callback) {
            setImmediate(callback, {});
          },
          getProperty: function (event, callback) {
            setImmediate(callback, { totalCount: 10 });
          },
        }),
      };
      controller = new AmfController({
        views: [new AmfRdfView()],
        prefixes: {
          amf: 'http://semweb.mmlab.be/ns/membership#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        },
        datasources: { amf: { title: 'My data', datasource: datasource } },
        cache: {
          get: function () {
            return null;
          },
          set: function () {},
        }, // Dummy cache
      });
      client = request.agent(new DummyServer(controller));
    });

    it('should correctly serve Amf in TURTLE', function (done) {
      client.get('/amf/amf').set('Accept', 'text/turtle').expect(function (response) {
        // var amf = fs.readFileSync(__dirname + '/../assets/amf.ttl', 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'text/turtle;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=604800');
        // response.should.have.property('text', Amf);
      }).end(done);
    });

    it('should hand over to the next controller if no Amf with that name is found', function (done) {
      client.get('/amf/unknown').expect(function (response) {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });

    it('should hand over to the next controller for non-Amf paths', function (done) {
      client.get('/other').expect(function (response) {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });
  });
});
