/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
import DummyServer from '../../../../test/DummyServer';
let AssetsController = require('../../lib/controllers/AssetsController').AssetsController; // changed to make tests pass, will be revised in follow up pr

let request = require('supertest'),
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
  });

  describe('An AssetsController instance', () => {
    let controller, client;
    beforeAll(() => {
      controller = new AssetsController();
      client = request.agent(new DummyServer(controller));
    });

    it('should correctly serve SVG assets', async () => {
      let response = await client.get('/assets/images/logo');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/images/logo.svg'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response.headers).toHaveProperty('content-type', 'image/svg+xml');
      expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
      expect(response.body.toString()).toBe(asset);
    });

    it('should correctly serve CSS assets', async () => {
      let response = await client.get('/assets/styles/ldf-server');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/styles/ldf-server.css'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response.headers).toHaveProperty('content-type', 'text/css;charset=utf-8');
      expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
      expect(response).toHaveProperty('text', asset);
    });

    it('should correctly serve ICO assets', async () => {
      let response = await client.get('/favicon.ico');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/favicon.ico'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response).toHaveProperty('statusCode', 200);
      expect(response.headers).toHaveProperty('content-type', 'image/vnd.microsoft.icon');
      expect(response.headers).toHaveProperty('cache-control', 'public,max-age=1209600');
      expect(response.body.toString()).toBe(asset);
    });

    it('should hand over to the next controller if no asset with that name is found', async () => {
      await client.get('/assets/unknown');
      expect(controller.next).toHaveBeenCalledOnce();
    });

    it('should hand over to the next controller for non-asset paths', async () => {
      await client.get('/other');
      expect(controller.next).toHaveBeenCalledOnce();
    });
  });
});
