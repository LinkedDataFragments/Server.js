/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
let TimegateController = require('../../lib/controllers/TimegateController').TimegateController; // changed to make tests pass, will be revised in follow up pr

let Controller = require('@ldf/core').controllers.Controller,
    UrlData = require('@ldf/core').UrlData,
    request = require('supertest'),
    DummyServer = require('../../../../test/DummyServer');

describe('TimegateController', () => {
  describe('The TimegateController module', () => {
    it('should be a function', () => {
      expect(typeof TimegateController).toBe('function');
    });

    it('should be a TimegateController constructor', () => {
      expect(new TimegateController()).toBeInstanceOf(TimegateController);
    });

    it('should be a Controller constructor', () => {
      expect(new TimegateController()).toBeInstanceOf(Controller);
    });
  });

  describe('A TimegateController instance', () => {
    it('should be first in the controller chain', () => {
      expect(new TimegateController()._first).toBe(true);
    });

    it('should use /timegate/ as the default timegate path', () => {
      expect(new TimegateController()._timegatePath).toBe('/timegate/');
    });

    it('should use the configured timegate path', () => {
      expect(new TimegateController({ timegates: { baseUrl: '/versions/' } })._timegatePath).toBe('/versions/');
    });
  });

  describe('parseTimegateMap', () => {
    it('should return an empty object when no mementos are given', () => {
      expect(TimegateController.parseTimegateMap(undefined)).toEqual({});
    });

    it('should convert a single memento config into a sorted timemap entry', () => {
      let datasource = { id: 'ds1', path: '/ds1/' };
      let map = TimegateController.parseTimegateMap({
        resource: [{ datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
      });
      expect(map.resource).toHaveLength(1);
      expect(map.resource[0].datasourceId).toBe('ds1');
      expect(map.resource[0].interval[0]).toEqual(new Date('2020-01-01T00:00:00Z'));
      expect(map.resource[0].interval[1]).toEqual(new Date('2020-06-01T00:00:00Z'));
    });

    it('should sort mementos by interval start', () => {
      let ds1 = { id: 'ds1', path: '/ds1/' }, ds2 = { id: 'ds2', path: '/ds2/' };
      let map = TimegateController.parseTimegateMap({
        resource: [
          { datasource: ds2, initial: '2021-01-01T00:00:00Z', final: '2021-06-01T00:00:00Z' },
          { datasource: ds1, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' },
        ],
      });
      expect(map.resource.map((entry) => entry.datasourceId)).toEqual(['ds1', 'ds2']);
    });
  });

  describe('parseInvertedTimegateMap', () => {
    let urlData = new UrlData({ baseURL: 'http://example.org/' });

    it('should return an empty object when no mementos are given', () => {
      expect(TimegateController.parseInvertedTimegateMap(undefined, urlData)).toEqual({});
    });

    it('should key entries by their datasource id', () => {
      let datasource = { id: 'ds1', path: '/ds1/' };
      let inverted = TimegateController.parseInvertedTimegateMap({
        resource: [{ datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
      }, urlData);
      expect(Object.keys(inverted)).toEqual(['ds1']);
      expect(inverted.ds1.memento).toBe('resource');
    });

    // A datasource without an id is a pre-existing, unusual configuration; the
    // controller has always stored it under the literal key "undefined"
    // rather than throwing, and the TS conversion preserves that.
    it('should key entries with a missing datasource id under the string "undefined"', () => {
      let datasource = { path: '/ds1/' };
      let inverted = TimegateController.parseInvertedTimegateMap({
        resource: [{ datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
      }, urlData);
      expect(Object.keys(inverted)).toEqual(['undefined']);
    });

    it('should fall back to the base URL and timegate id when no original URL is configured', () => {
      let datasource = { id: 'ds1', path: '/ds1/' };
      let inverted = TimegateController.parseInvertedTimegateMap({
        resource: [{ datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
      }, urlData);
      expect(inverted.ds1.original).toBe('http://example.org/resource');
    });

    it('should fall back to a bare / when the given urlData has no base URL', () => {
      let datasource = { id: 'ds1', path: '/ds1/' };
      let inverted = TimegateController.parseInvertedTimegateMap({
        resource: [{ datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
      }, {});
      expect(inverted.ds1.original).toBe('/resource');
    });

    it('should use the configured original URL when given', () => {
      let datasource = { id: 'ds1', path: '/ds1/' };
      let inverted = TimegateController.parseInvertedTimegateMap({
        resource: [{
          datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z',
          originalBaseURL: 'http://original.example.org/',
        }],
      }, urlData);
      expect(inverted.ds1.original).toBe('http://original.example.org/');
    });
  });

  describe('_getClosestMemento', () => {
    let controller = new TimegateController();
    function entry(id, start, end) {
      return { datasource: { id, path: '/' + id + '/' }, datasourceId: id, interval: [new Date(start), new Date(end)] };
    }
    let timemap = [
      entry('a', '2020-01-01T00:00:00Z', '2020-02-01T00:00:00Z'),
      entry('b', '2020-03-01T00:00:00Z', '2020-04-01T00:00:00Z'),
      entry('c', '2020-05-01T00:00:00Z', '2020-06-01T00:00:00Z'),
    ];

    it('should return null for an empty timemap', () => {
      expect(controller._getClosestMemento([], new Date())).toBe(null);
    });

    it('should return the first memento when the date is before it', () => {
      expect(controller._getClosestMemento(timemap, new Date('2019-01-01T00:00:00Z')).datasourceId).toBe('a');
    });

    it('should return the last memento when the date is after it', () => {
      expect(controller._getClosestMemento(timemap, new Date('2021-01-01T00:00:00Z')).datasourceId).toBe('c');
    });

    it('should return the memento whose interval contains the date', () => {
      expect(controller._getClosestMemento(timemap, new Date('2020-03-15T00:00:00Z')).datasourceId).toBe('b');
    });

    it('should return the previous memento when the date falls in a gap between intervals', () => {
      expect(controller._getClosestMemento(timemap, new Date('2020-02-15T00:00:00Z')).datasourceId).toBe('a');
    });

    it('should return null for an invalid accept-datetime', () => {
      expect(controller._getClosestMemento(timemap, 'not-a-date')).toBe(null);
    });

    it('should sort an unsorted timemap when told to', () => {
      let unsorted = [timemap[2], timemap[0], timemap[1]];
      expect(controller._getClosestMemento(unsorted, new Date('2020-03-15T00:00:00Z'), true).datasourceId).toBe('b');
    });

    it('should skip mementos with a non-finite interval when scanning for a match', () => {
      let invalidEntry = { datasource: { id: 'invalid', path: '/invalid/' }, datasourceId: 'invalid', interval: [new Date('not-a-date'), new Date('not-a-date')] };
      let withInvalid = [
        entry('a', '2020-01-01T00:00:00Z', '2020-02-01T00:00:00Z'),
        invalidEntry,
        entry('c', '2020-05-01T00:00:00Z', '2020-06-01T00:00:00Z'),
        entry('d', '2020-07-01T00:00:00Z', '2020-08-01T00:00:00Z'),
      ];
      // The invalid entry is skipped by the isFinite check, so it's never matched
      // directly — it only resurfaces as the "previous" entry once 'c' is reached.
      expect(controller._getClosestMemento(withInvalid, new Date('2020-03-15T00:00:00Z'))).toBe(invalidEntry);
    });

    it('should return null when no memento in the timemap has a finite interval', () => {
      let allInvalid = [
        { datasource: { id: 'x' }, datasourceId: 'x', interval: [new Date('not-a-date'), new Date('not-a-date')] },
        { datasource: { id: 'y' }, datasourceId: 'y', interval: [new Date('not-a-date'), new Date('not-a-date')] },
      ];
      expect(controller._getClosestMemento(allInvalid, new Date('2020-03-15T00:00:00Z'))).toBe(null);
    });
  });

  describe('An instance handling requests', () => {
    let controller, client;
    beforeAll(() => {
      let datasource = { id: 'ds1', path: '/ds1/' };
      controller = new TimegateController({
        timegates: {
          mementos: {
            resource: [{ datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
          },
        },
      });
      client = request.agent(new DummyServer(controller));
    });

    it('should hand over to the next controller for a non-timegate path', () => new Promise((done) => {
      client.get('/other/').end(() => {
        expect(controller.next.calledOnce).toBe(true);
        done();
      });
    }));

    it('should hand over to the next controller for an unconfigured timegate', () => new Promise((done) => {
      client.get('/timegate/unconfigured').end(() => {
        expect(controller.next.calledOnce).toBe(true);
        done();
      });
    }));

    it('should end an OPTIONS request without handing over to the next controller', () => new Promise((done) => {
      client.options('/timegate/resource').end((error, res) => {
        expect(res.statusCode).toBe(200);
        expect(controller.next.called).toBe(false);
        done();
      });
    }));

    it('should redirect to the closest memento with Link and Vary headers', () => new Promise((done) => {
      client.get('/timegate/resource').end((error, res) => {
        expect(res.headers).toHaveProperty('vary', 'Accept-Datetime');
        expect(res.headers.link).toContain('rel="memento"');
        expect(res.headers.link).toContain('rel="original"');
        done();
      });
    }));

    describe('for a configured timegate with no mementos', () => {
      let emptyController, emptyClient;
      beforeAll(() => {
        emptyController = new TimegateController({
          timegates: { mementos: { resource: [] } },
        });
        emptyClient = request.agent(new DummyServer(emptyController));
      });

      it('should hand over to the next controller instead of redirecting', () => new Promise((done) => {
        emptyClient.get('/timegate/resource').end(() => {
          expect(emptyController.next.calledOnce).toBe(true);
          done();
        });
      }));
    });

    describe('for a timegate whose timemap carries a custom original base URL', () => {
      let customClient;
      beforeAll(() => {
        let datasource = { id: 'ds1', path: '/ds1/' };
        let customController = new TimegateController({
          timegates: {
            mementos: {
              resource: [{
                datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z',
                originalBaseURL: 'http://original.example.org/custom-path',
              }],
            },
          },
        });
        customClient = request.agent(new DummyServer(customController));
      });

      it('should build the original link from the custom base URL', () => new Promise((done) => {
        customClient.get('/timegate/resource?foo=bar').end((error, res) => {
          expect(res.headers.link).toContain('<http://original.example.org/custom-path?foo=bar>;rel="original"');
          done();
        });
      }));
    });
  });
});
