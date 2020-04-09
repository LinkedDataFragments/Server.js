/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let AssetsController = require('../../lib/controllers/AssetsController');

let request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer'),
    fs = require('fs'),
    path = require('path');

describe('AssetsController', () => {
  describe('The AssetsController module', () => {
    it('should be a function', () => {
      AssetsController.should.be.a('function');
    });

    it('should be an AssetsController constructor', () => {
      new AssetsController().should.be.an.instanceof(AssetsController);
    });
  });

  describe('An AssetsController instance', () => {
    let controller, client;
    before(() => {
      controller = new AssetsController();
      client = request.agent(new DummyServer(controller));
    });

    it('should correctly serve SVG assets', (done) => {
      client.get('/assets/images/logo').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/images/logo.svg'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/svg+xml');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.body.toString().should.equal(asset);
      }).end(done);
    });

    it('should correctly serve CSS assets', (done) => {
      client.get('/assets/styles/ldf-server').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/styles/ldf-server.css'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'text/css;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.should.have.property('text', asset);
      }).end(done);
    });

    it('should correctly serve ICO assets', (done) => {
      client.get('/favicon.ico').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/favicon.ico'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'image/vnd.microsoft.icon');
        response.headers.should.have.property('cache-control', 'public,max-age=1209600');
        response.body.toString().should.equal(asset);
      }).end(done);
    });

    it('should hand over to the next controller if no asset with that name is found', (done) => {
      client.get('/assets/unknown').expect((response) => {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });

    it('should hand over to the next controller for non-asset paths', (done) => {
      client.get('/other').expect((response) => {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });
  });
});
