/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */
let MementoControllerExtension = require('../../lib/controllers/MementoControllerExtension');

let Controller = require('@ldf/core').controllers.Controller,
    UrlData = require('@ldf/core').UrlData,
    url = require('url');

describe('MementoControllerExtension', () => {
  describe('The MementoControllerExtension module', () => {
    it('should be a function', () => {
      MementoControllerExtension.should.be.a('function');
    });

    it('should be a MementoControllerExtension constructor', () => {
      new MementoControllerExtension({ urlData: new UrlData() }).should.be.an.instanceof(MementoControllerExtension);
    });

    it('should be a Controller constructor', () => {
      new MementoControllerExtension({ urlData: new UrlData() }).should.be.an.instanceof(Controller);
    });
  });

  describe('An instance for a datasource with a memento configured', () => {
    let datasource = { id: 'ds1', path: '/ds1/' };
    let extension = new MementoControllerExtension({
      urlData: new UrlData({ baseURL: 'http://example.org/' }),
      timegates: {
        mementos: {
          resource: [{ datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
        },
      },
    });

    it('should add original and timegate links for a request matching the memento', (done) => {
      let request = { url: '/ds1/?subject=x', parsedUrl: url.parse('http://example.org/ds1/?subject=x', true) },
          headers = {}, response = { setHeader: (name, value) => { headers[name] = value; } },
          settings = { query: {}, datasource: { id: 'ds1' } };

      extension._handleRequest(request, response, () => {
        headers.Link.should.contain('rel=original');
        headers.Link.should.contain('rel=timegate');
        headers.Link.should.contain('/timegate/resource');
        headers.should.have.property('Memento-Datetime');
        done();
      }, settings);
    });

    it('should add a local timegate link for a non-memento resource with timegate: true', (done) => {
      let request = { url: '/ds2/?subject=x', parsedUrl: url.parse('http://example.org/ds2/?subject=x', true) },
          headers = {}, response = { setHeader: (name, value) => { headers[name] = value; } },
          settings = { query: { datasource: 'ds2' }, datasource: { id: 'ds2', timegate: true } };

      extension._handleRequest(request, response, () => {
        headers.Link.should.contain('rel=timegate');
        headers.Link.should.contain('/timegate/ds2');
        done();
      }, settings);
    });

    it('should use a configured external timegate URL as-is', (done) => {
      let request = { url: '/ds3/?subject=x', parsedUrl: url.parse('http://example.org/ds3/?subject=x', true) },
          headers = {}, response = { setHeader: (name, value) => { headers[name] = value; } },
          settings = { query: { datasource: 'ds3' }, datasource: { id: 'ds3', timegate: 'http://external.example.org/timegate/ds3' } };

      extension._handleRequest(request, response, () => {
        headers.Link.should.equal('<http://external.example.org/timegate/ds3?subject=x>;rel=timegate');
        done();
      }, settings);
    });

    it('should not add a Link header for a resource without a timegate configuration', (done) => {
      let request = { url: '/ds4/?subject=x', parsedUrl: url.parse('http://example.org/ds4/?subject=x', true) },
          headers = {}, response = { setHeader: (name, value) => { headers[name] = value; } },
          settings = { query: { datasource: 'ds4' }, datasource: { id: 'ds4' } };

      extension._handleRequest(request, response, () => {
        headers.should.not.have.property('Link');
        done();
      }, settings);
    });

    it('should always hand over to the next controller', () => {
      let request = { url: '/ds4/?subject=x', parsedUrl: url.parse('http://example.org/ds4/?subject=x', true) },
          response = { setHeader: () => {} },
          settings = { query: { datasource: 'ds4' }, datasource: { id: 'ds4' } },
          next = sinon.spy();

      extension._handleRequest(request, response, next, settings);
      next.should.have.been.calledOnce;
    });
  });
});
