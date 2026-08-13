/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
let ViewCollection = require('../../lib/views/ViewCollection').ViewCollection; // changed to make tests pass, will be revised in follow up pr

let View = require('../../lib/views/View').View; // changed to make tests pass, will be revised in follow up pr

describe('ViewCollection', () => {
  describe('The ViewCollection module', () => {
    it('should be a function', () => {
      expect(typeof ViewCollection).toBe('function');
    });

    it('should be a ViewCollection constructor', () => {
      expect(new ViewCollection()).toBeInstanceOf(ViewCollection);
    });
  });

  describe('A ViewCollection instance without views', () => {
    let viewCollection;
    beforeAll(() => {
      viewCollection = new ViewCollection();
    });

    it('should throw an error when matching a view', () => {
      expect(() => { viewCollection.matchView('Foo'); })
        .toThrow('No view named Foo found.');
    });
  });

  describe('A ViewCollection instance with one view', () => {
    let viewCollection, viewA;
    beforeAll(() => {
      viewA = new View('MyView1', 'text/html,application/trig;q=0.7');
      viewCollection = new ViewCollection([viewA]);
    });

    it('should throw an error when matching a view with a non-existing type', () => {
      expect(() => { viewCollection.matchView('Bar'); })
        .toThrow('No view named Bar found.');
    });

    describe('when a client requests HTML', () => {
      let viewDetails, request, response;
      beforeAll(() => {
        request = { headers: { accept: 'text/html' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView1', request, response);
      });

      it('should return a match for the view', () => {
        expect(viewDetails).toHaveProperty('view', viewA);
        expect(viewDetails).toHaveProperty('type', 'text/html');
        expect(viewDetails).toHaveProperty('responseType', 'text/html;charset=utf-8');
      });
    });

    describe('when a client requests TriG', () => {
      let viewDetails, request, response;
      beforeAll(() => {
        request = { headers: { accept: 'application/trig' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView1', request, response);
      });

      it('should return a match for the view', () => {
        expect(viewDetails).toHaveProperty('view', viewA);
        expect(viewDetails).toHaveProperty('type', 'application/trig');
        expect(viewDetails).toHaveProperty('responseType', 'application/trig;charset=utf-8');
      });
    });
  });

  describe('A ViewCollection instance with three views of two types', () => {
    let viewCollection, viewA, viewB, viewC;
    beforeAll(() => {
      viewA = new View('MyView1', 'text/html,application/trig;q=0.5');
      viewB = new View('MyView1', 'text/html;q=1.0,application/trig');
      viewC = new View('MyView2', 'text/html');
      viewCollection = new ViewCollection([viewA, viewB, viewC]);
    });

    it('should throw an error when matching a view with a non-existing type', () => {
      expect(() => { viewCollection.matchView('Bar'); })
        .toThrow('No view named Bar found.');
    });

    describe('when matching a request of one view type as HTML', () => {
      let viewDetails, request, response;
      beforeAll(() => {
        request = { headers: { accept: 'text/html' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView1', request, response);
      });

      it('should return a description of the best fitting view', () => {
        expect(viewDetails).toHaveProperty('view', viewA);
        expect(viewDetails).toHaveProperty('type', 'text/html');
        expect(viewDetails).toHaveProperty('responseType', 'text/html;charset=utf-8');
      });
    });

    describe('when matching a request of one view type as TriG', () => {
      let viewDetails, request, response;
      beforeAll(() => {
        request = { headers: { accept: 'application/trig' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView1', request, response);
      });

      it('should return a description of the best fitting view', () => {
        expect(viewDetails).toHaveProperty('view', viewB);
        expect(viewDetails).toHaveProperty('type', 'application/trig');
        expect(viewDetails).toHaveProperty('responseType', 'application/trig;charset=utf-8');
      });
    });

    describe('when matching a request of another view type as HTML', () => {
      let viewDetails, request, response;
      beforeAll(() => {
        request = { headers: { accept: 'text/html' } };
        response = {};
        viewDetails = viewCollection.matchView('MyView2', request, response);
      });

      it('should return a description of the other view', () => {
        expect(viewDetails).toHaveProperty('view', viewC);
        expect(viewDetails).toHaveProperty('type', 'text/html');
        expect(viewDetails).toHaveProperty('responseType', 'text/html;charset=utf-8');
      });
    });
  });
});
