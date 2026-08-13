/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */

import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
let MementoControllerExtension = require('../../lib/controllers/MementoControllerExtension').MementoControllerExtension; // changed to make tests pass, will be revised in follow up pr

let Controller = require('@ldf/core').controllers.Controller,
    UrlData = require('@ldf/core').UrlData,
    url = require('url');

describe('MementoControllerExtension', () => {
  describe('The MementoControllerExtension module', () => {
    it('should be a function', () => {
      expect(typeof MementoControllerExtension).toBe('function');
    });

    it('should be a MementoControllerExtension constructor', () => {
      expect(new MementoControllerExtension({ urlData: new UrlData() })).toBeInstanceOf(MementoControllerExtension);
    });

    it('should be a Controller constructor', () => {
      expect(new MementoControllerExtension({ urlData: new UrlData() })).toBeInstanceOf(Controller);
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

    it('should add original and timegate links for a request matching the memento', () => new Promise((done) => {
      let request = { url: '/ds1/?subject=x', parsedUrl: url.parse('http://example.org/ds1/?subject=x', true) },
          headers = {}, response = { setHeader: (name, value) => { headers[name] = value; } },
          settings = { query: {}, datasource: { id: 'ds1' } };

      extension._handleRequest(request, response, () => {
        expect(headers.Link).toContain('rel=original');
        expect(headers.Link).toContain('rel=timegate');
        expect(headers.Link).toContain('/timegate/resource');
        expect(headers).toHaveProperty('Memento-Datetime');
        done();
      }, settings);
    }));

    it('should add a local timegate link for a non-memento resource with timegate: true', () => new Promise((done) => {
      let request = { url: '/ds2/?subject=x', parsedUrl: url.parse('http://example.org/ds2/?subject=x', true) },
          headers = {}, response = { setHeader: (name, value) => { headers[name] = value; } },
          settings = { query: { datasource: 'ds2' }, datasource: { id: 'ds2', timegate: true } };

      extension._handleRequest(request, response, () => {
        expect(headers.Link).toContain('rel=timegate');
        expect(headers.Link).toContain('/timegate/ds2');
        done();
      }, settings);
    }));

    it('should use a configured external timegate URL as-is', () => new Promise((done) => {
      let request = { url: '/ds3/?subject=x', parsedUrl: url.parse('http://example.org/ds3/?subject=x', true) },
          headers = {}, response = { setHeader: (name, value) => { headers[name] = value; } },
          settings = { query: { datasource: 'ds3' }, datasource: { id: 'ds3', timegate: 'http://external.example.org/timegate/ds3' } };

      extension._handleRequest(request, response, () => {
        expect(headers.Link).toBe('<http://external.example.org/timegate/ds3?subject=x>;rel=timegate');
        done();
      }, settings);
    }));

    it('should not add a Link header for a resource without a timegate configuration', () => new Promise((done) => {
      let request = { url: '/ds4/?subject=x', parsedUrl: url.parse('http://example.org/ds4/?subject=x', true) },
          headers = {}, response = { setHeader: (name, value) => { headers[name] = value; } },
          settings = { query: { datasource: 'ds4' }, datasource: { id: 'ds4' } };

      extension._handleRequest(request, response, () => {
        expect(headers).not.toHaveProperty('Link');
        done();
      }, settings);
    }));

    it('should always hand over to the next controller', () => {
      let request = { url: '/ds4/?subject=x', parsedUrl: url.parse('http://example.org/ds4/?subject=x', true) },
          response = { setHeader: () => {} },
          settings = { query: { datasource: 'ds4' }, datasource: { id: 'ds4' } },
          next = sinon.spy();

      extension._handleRequest(request, response, next, settings);
      expect(next.calledOnce).toBe(true);
    });
  });
});
