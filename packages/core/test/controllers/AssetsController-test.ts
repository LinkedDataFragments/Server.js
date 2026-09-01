/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
import { DummyServer, type SpiedController } from '../../../../test/DummyServer';
import { listen } from '../../../../test/test-helpers';
import { controllers } from '../../index';

import * as fs from 'fs';
import * as path from 'path';

const { AssetsController } = controllers;

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
    let controller: InstanceType<typeof AssetsController> & Partial<SpiedController>, baseUrl: string;
    beforeAll(async () => {
      controller = new AssetsController();
      baseUrl = await listen(DummyServer(controller));
    });

    it('should correctly serve SVG assets', async () => {
      let response = await fetch(baseUrl + '/assets/images/logo');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/images/logo.svg'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/svg+xml');
      expect(response.headers.get('cache-control')).toBe('public,max-age=1209600');
      expect(await response.text()).toBe(asset);
    });

    it('should correctly serve CSS assets', async () => {
      let response = await fetch(baseUrl + '/assets/styles/ldf-server');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/styles/ldf-server.css'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/css;charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('public,max-age=1209600');
      expect(await response.text()).toBe(asset);
    });

    it('should correctly serve ICO assets', async () => {
      let response = await fetch(baseUrl + '/favicon.ico');
      let asset = fs.readFileSync(path.join(__dirname, '/../../assets/favicon.ico'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/vnd.microsoft.icon');
      expect(response.headers.get('cache-control')).toBe('public,max-age=1209600');
      expect(await response.text()).toBe(asset);
    });

    it('should hand over to the next controller if no asset with that name is found', async () => {
      await fetch(baseUrl + '/assets/unknown');
      expect(controller.next).toHaveBeenCalledOnce();
    });

    it('should hand over to the next controller for non-asset paths', async () => {
      await fetch(baseUrl + '/other');
      expect(controller.next).toHaveBeenCalledOnce();
    });
  });
});
