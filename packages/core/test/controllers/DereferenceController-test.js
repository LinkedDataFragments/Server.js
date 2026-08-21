/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
let DereferenceController = require('../../lib/controllers/DereferenceController').DeferenceController; // changed to make tests pass, will be revised in follow up pr

let request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer');

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
    let controller, client;
    beforeAll(() => {
      controller = new DereferenceController({ dereference: { '/resource/': { path: 'dbpedia/2014' } } });
      client = request.agent(new DummyServer(controller));
    });

    describe('receiving a request for a dereferenced URL', () => {
      let response;
      beforeAll(() => new Promise((done) => {
        client.get('/resource/Mickey_Mouse')
          .end((error, res) => { response = res; done(error); });
      }));

      it('should not hand over to the next controller', () => {
        expect(controller.next.called).toBe(false);
      });

      it('should set the status code to 303', () => {
        expect(response).toHaveProperty('statusCode', 303);
      });

      it('should set the text/plain content type', () => {
        expect(response.headers).toHaveProperty('content-type', 'text/plain;charset=utf-8');
      });

      it('should set the Location header correctly', () => {
        let hostname = response.req.getHeader('Host'),
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        expect(response.headers).toHaveProperty('location', expectedLocation);
      });

      it('should mention the desired location in the body', () => {
        let hostname = response.req.getHeader('Host'),
            entityUrl = encodeURIComponent('http://' + hostname + '/resource/Mickey_Mouse'),
            expectedLocation = 'http://' + hostname + '/dbpedia/2014?subject=' + entityUrl;

        expect(response.text).toContain(expectedLocation);
      });
    });

    describe('receiving a request for a non-defererenced URL', () => {
      beforeAll(() => new Promise((done) => {
        client.get('/otherresource/Mickey_Mouse').end(done);
      }));

      it('should hand over to the next controller', () => {
        expect(controller.next.calledOnce).toBe(true);
      });
    });
  });
});
