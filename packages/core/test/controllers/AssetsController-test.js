/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
let AssetsController = require('../../lib/controllers/AssetsController').AssetsController; // changed to make tests pass, will be revised in follow up pr
let UrlData = require('../../lib/UrlData').UrlData;

let request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer'),
    fs = require('fs'),
    path = require('path');

describe('AssetsController', () => {
  describe('The AssetsController module', () => {
    it('should be a function', () => {
      expect(typeof AssetsController).toBe('function');
    });

    it('should be an AssetsController constructor', () => {
      expect(new AssetsController()).toBeInstanceOf(AssetsController);
    });

    it('should use the assets path from a given urlData', () => {
      let controller = new AssetsController({ urlData: new UrlData({ assetsPath: '/static/' }) });
      return request.agent(new DummyServer(controller)).get('/static/images/logo').expect((response) => {
        expect(response).toHaveProperty('statusCode', 200);
      });
    });
  });

  describe('An AssetsController instance', () => {
    let controller, client;
    beforeAll(() => {
      controller = new AssetsController();
      client = request.agent(new DummyServer(controller));
    });

    it('should correctly serve SVG assets', () => new Promise((done) => {
      client.get('/assets/images/logo').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/images/logo.svg'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'image/svg+xml');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response.body.toString()).toBe(asset);
      }).end(done);
    }));

    it('should correctly serve CSS assets', () => new Promise((done) => {
      client.get('/assets/styles/ldf-server').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/styles/ldf-server.css'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'text/css;charset=utf-8');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response).toHaveProperty('text', asset);
      }).end(done);
    }));

    it('should correctly serve ICO assets', () => new Promise((done) => {
      client.get('/favicon.ico').expect((response) => {
        let asset = fs.readFileSync(path.join(__dirname, '/../../assets/favicon.ico'), 'utf8');
        expect(controller.next.called).toBe(false);
        expect(response).toHaveProperty('statusCode', 200);
        expect(response.headers).toHaveProperty('content-type', 'image/vnd.microsoft.icon');
        expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
        expect(response.body.toString()).toBe(asset);
      }).end(done);
    }));

    it('should hand over to the next controller if no asset with that name is found', () => new Promise((done) => {
      client.get('/assets/unknown').expect((response) => {
        expect(controller.next.calledOnce).toBe(true);
      }).end(done);
    }));

    it('should hand over to the next controller for non-asset paths', () => new Promise((done) => {
      client.get('/other').expect((response) => {
        expect(controller.next.calledOnce).toBe(true);
      }).end(done);
    }));
  });
});
