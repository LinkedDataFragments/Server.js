/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var SummaryController = require('../../lib/controllers/SummaryController');

var request = require('supertest'),
    DummyServer = require('./DummyServer'),
    fs = require('fs'),
    path = require('path');

var SummaryRdfView = require('../../lib/views/summary/SummaryRdfView.js');

describe('SummaryController', function () {
  describe('The SummaryController module', function () {
    it('should be a function', function () {
      SummaryController.should.be.a('function');
    });

    it('should be an SummaryController constructor', function () {
      new SummaryController().should.be.an.instanceof(SummaryController);
    });

    it('should create new SummaryController objects', function () {
      SummaryController().should.be.an.instanceof(SummaryController);
    });
  });

  describe('An SummaryController instance', function () {
    var controller, client;
    before(function () {
      controller = new SummaryController({
        views: [new SummaryRdfView()],
        summaries: { dir: '../../test/assets' },
        prefixes: {
          ds: 'http://semweb.mmlab.be/ns/datasummaries#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        },
      });
      client = request.agent(new DummyServer(controller));
    });

    it('should correctly serve summary in Turtle', function (done) {
      client.get('/summaries/summary').set('Accept', 'text/turtle').expect(function (response) {
        var summary = fs.readFileSync(path.join(__dirname, '/../assets/summary.ttl'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'text/turtle;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=604800');
        response.text.should.equal(summary);
      }).end(done);
    });

    it('should correctly serve summary in Trig', function (done) {
      client.get('/summaries/summary').expect(function (response) {
        var summary = fs.readFileSync(path.join(__dirname, '/../assets/summary.ttl'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'application/trig;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=604800');
        response.text.should.equal(summary);
      }).end(done);
    });

    it('should correctly serve summary in ntriples', function (done) {
      client.get('/summaries/summary').set('Accept', 'application/n-triples').expect(function (response) {
        var summary = fs.readFileSync(path.join(__dirname, '/../assets/summary.nt'), 'utf8');
        controller.next.should.not.have.been.called;
        response.should.have.property('statusCode', 200);
        response.headers.should.have.property('content-type', 'application/n-triples;charset=utf-8');
        response.headers.should.have.property('cache-control', 'public,max-age=604800');
        response.text.should.equal(summary);
      }).end(done);
    });

    it('should hand over to the next controller if no summary with that name is found', function (done) {
      client.get('/summaries/unknown').expect(function (response) {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });

    it('should hand over to the next controller for non-summary paths', function (done) {
      client.get('/other').expect(function (response) {
        controller.next.should.have.been.calledOnce;
      }).end(done);
    });
  });
});
