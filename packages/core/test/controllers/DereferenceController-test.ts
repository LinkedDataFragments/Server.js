/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
import { DummyServer, type SpiedController } from '../../../../test/DummyServer';
import { listen } from '../../../../test/test-helpers';
import { controllers, datasources } from '../../index';
import { DataFactory as dataFactory } from 'n3';

const { DereferenceController } = controllers;
const { Datasource } = datasources;

describe('DereferenceController', () => {
  describe('The DereferenceController module', () => {
    it('should be a function', () => {
      expect(typeof DereferenceController).toBe('function');
    });

    it('should be a DereferenceController constructor', () => {
      expect(new DereferenceController()).toBeInstanceOf(DereferenceController);
    });
  });

  describe('A DereferenceController instance', () => {
    let controller: InstanceType<typeof DereferenceController> & Partial<SpiedController>, baseUrl: string, hostname: string;
    beforeAll(async () => {
      controller = new DereferenceController({ dereference: { '/resource/': new Datasource({ dataFactory, path: 'dbpedia/2014' }) } });
      baseUrl = await listen(DummyServer(controller));
      hostname = new URL(baseUrl).host;
    });

    describe('receiving a request for a dereferenced URL', () => {
      let response: Response, responseText: string;
      beforeAll(async () => {
        response = await fetch(baseUrl + '/resource/Mickey_Mouse', { redirect: 'manual' });
        responseText = await response.text();
      });

      it('should not hand over to the next controller', () => {
        expect(controller.next).not.toHaveBeenCalled();
      });

      it('should set the status code to 303', () => {
        expect(response.status).toBe(303);
      });

      it('should set the text/plain content type', () => {
        expect(response.headers.get('content-type')).toBe('text/plain;charset=utf-8');
      });

      it('should set the Location header correctly', () => {
        let entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        expect(response.headers.get('location')).toBe(expectedLocation);
      });

      it('should mention the desired location in the body', () => {
        let entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        expect(responseText).toContain(expectedLocation);
      });
    });

    describe('receiving a request for a non-defererenced URL', () => {
      beforeAll(() => fetch(baseUrl + '/otherresource/Mickey_Mouse'));

      it('should hand over to the next controller', () => {
        expect(controller.next).toHaveBeenCalledOnce();
      });
    });
  });
});
