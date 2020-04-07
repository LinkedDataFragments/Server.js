/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let SummaryController = require('../../lib/controllers/SummaryController');

let request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer'),
    fs = require('fs'),
    path = require('path');

let SummaryRdfView = require('../../lib/views/summary/SummaryRdfView.js');

describe('SummaryController', () => {
  describe('The SummaryController module', () => {
    it('should be a function', () => {
      SummaryController.should.be.a('function');
    });

    it('should be an SummaryController constructor', () => {
      new SummaryController().should.be.an.instanceof(SummaryController);
    });

    it('should create new SummaryController objects', () => {
      new SummaryController().should.be.an.instanceof(SummaryController);
    });
  });

  describe('An SummaryController instance', () => {
    let controller, client;
    before(() => {
      controller = new SummaryController({
        views: [new SummaryRdfView()],
        summaries: { dir: path.join(__dirname, '/../../../../test/assets') },
        prefixes: {
          ds: 'http://semweb.mmlab.be/ns/datasummaries#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        },
      });
      client = request.agent(new DummyServer(controller));
    });

    it('should correctly serve summary in Turtle', (done) => {
      client.get('/summaries/summary').set('Accept', 'text/turtle').expect((response) => {
        let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.ttl'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'text/turtle;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=604800');
        response.text.should.equal(summary);
      }).end(done);
    });

    it('should correctly serve summary in Trig', (done) => {
      client.get('/summaries/summary').expect((response) => {
        let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.ttl'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'application/trig;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=604800');
        response.text.should.equal(summary);
      }).end(done);
    });

    it('should correctly serve summary in ntriples', (done) => {
      client.get('/summaries/summary').set('Accept', 'application/n-triples').expect((response) => {
        let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.nt'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'application/n-triples;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=604800');
        response.text.should.equal(summary);
      }).end(done);
    });

    it('should hand over to the next controller if no summary with that name is found', (done) => {
      client.get('/summaries/unknown').expect((response) => {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });

    it('should hand over to the next controller for non-summary paths', (done) => {
      client.get('/other').expect((response) => {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });
  });
});
