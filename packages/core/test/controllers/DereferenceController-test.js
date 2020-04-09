/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let DereferenceController = require('../../lib/controllers/DereferenceController');

let request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer');

describe('DereferenceController', () => {
  describe('The DereferenceController module', () => {
    it('should be a function', () => {
      DereferenceController.should.be.a('function');
    });

    it('should be a DereferenceController constructor', () => {
      new DereferenceController().should.be.an.instanceof(DereferenceController);
    });
  });

  describe('A DereferenceController instance', () => {
    let controller, client;
    before(() => {
      controller = new DereferenceController({ dereference: { '/resource/': { path: 'dbpedia/2014' } } });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request for a dereferenced URL', () => {
      let response;
      before((done) => {
        client.get('/resource/Mickey_Mouse')
          .end((error, res) => { response = res; done(error); });
      });

      it('should not hand over to the next controller', () => {
        controller.next.should.not.have.been.called;
      });

      it('should set the status code to 303', () => {
        response.should.have.property('statusCode', 303);
      });

      it('should set the text/plain content type', () => {
        response.headers.should.have.property('content-type', 'text/plain;charset=utf-8');
      });

      it('should set the Location header correctly', () => {
        let hostname = response.req.getHeader('Host'),
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        response.headers.should.have.property('location', expectedLocation);
      });

      it('should mention the desired location in the body', () => {
        let hostname = response.req.getHeader('Host'),
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        response.text.should.contain(expectedLocation);
      });
    });

    describe('receiving a request for a non-defererenced URL', () => {
      before((done) => {
        client.get('/otherresource/Mickey_Mouse').end(done);
      });

      it('should hand over to the next controller', () => {
        controller.next.should.have.been.calledOnce;
      });
    });
  });
});
