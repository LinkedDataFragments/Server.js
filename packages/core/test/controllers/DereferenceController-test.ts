/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
import { DummyServer } from '../../../../test/DummyServer';
import { request, type FetchLikeResponse } from '../../../../test/test-helpers';
import { datasources } from '../../index';
import { DeferenceController as DereferenceController } from '../../lib/controllers/DereferenceController';
import { DataFactory as dataFactory } from 'n3';

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
    let controller: DereferenceController, server: DummyServer;
    const hostname = 'localhost:80';
    beforeAll(() => {
      controller = new DereferenceController({ dereference: { '/resource/': new Datasource({ dataFactory, path: 'dbpedia/2014' }) } });
      server = new DummyServer(controller);
    });

    describe('receiving a request for a dereferenced URL', () => {
      let response: FetchLikeResponse, responseText: string;
      beforeAll(async () => {
        response = await request(server, '/resource/Mickey_Mouse');
        responseText = await response.text();
      });

      it('should not hand over to the next controller', () => {
        expect(server.next).not.toHaveBeenCalled();
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
      beforeAll(() => request(server, '/otherresource/Mickey_Mouse'));

      it('should hand over to the next controller', () => {
        expect(server.next).toHaveBeenCalledOnce();
      });
    });
  });
});
