/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
import { DummyServer } from '../../../../test/DummyServer';
import { request } from '../../../../test/test-helpers';
import { AssetsController } from '../../lib/controllers/AssetsController';

import * as fs from 'fs';
import * as path from 'path';

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
    let controller: AssetsController, server: DummyServer;
    beforeAll(() => {
      controller = new AssetsController();
      server = new DummyServer(controller);
    });

    it('should correctly serve SVG assets', async () => {
      let response = await request(server, '/assets/images/logo');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/images/logo.svg'), 'utf8');
      expect(server.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/svg+xml');
      expect(response.headers.get('cache-control')).toBe('public,max-age=1209600');
      expect(await response.text()).toBe(asset);
    });

    it('should correctly serve CSS assets', async () => {
      let response = await request(server, '/assets/styles/ldf-server');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/styles/ldf-server.css'), 'utf8');
      expect(server.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/css;charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('public,max-age=1209600');
      expect(await response.text()).toBe(asset);
    });

    it('should correctly serve ICO assets', async () => {
      let response = await request(server, '/favicon.ico');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/favicon.ico'), 'utf8');
      expect(server.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/vnd.microsoft.icon');
      expect(response.headers.get('cache-control')).toBe('public,max-age=1209600');
      expect(await response.text()).toBe(asset);
    });

    it('should hand over to the next controller if no asset with that name is found', async () => {
      await request(server, '/assets/unknown');
      expect(server.next).toHaveBeenCalledOnce();
    });

    it('should hand over to the next controller for non-asset paths', async () => {
      await request(server, '/other');
      expect(server.next).toHaveBeenCalledOnce();
    });
  });
});
