/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, beforeAll } from 'vitest';
import { DummyServer, type SpiedController } from '../../../../test/DummyServer';
import { listen } from '../../../../test/test-helpers';
import { controllers, views } from '../../index';

import * as fs from 'fs';
import * as path from 'path';

import { DataFactory as dataFactory } from 'n3';

const { SummaryController } = controllers;
const { SummaryRdfView } = views.summary;

describe('SummaryController', () => {
  describe('The SummaryController module', () => {
    it('should be a function', () => {
      expect(typeof SummaryController).toBe('function');
    });

    it('should be an SummaryController constructor', () => {
      expect(new SummaryController()).toBeInstanceOf(SummaryController);
    });

    it('should create new SummaryController objects', () => {
      expect(new SummaryController()).toBeInstanceOf(SummaryController);
    });
  });

  describe('An SummaryController instance', () => {
    let controller: InstanceType<typeof SummaryController> & Partial<SpiedController>, baseUrl: string;
    beforeAll(async () => {
      controller = new SummaryController({
        views: [new SummaryRdfView({ dataFactory })],
        summaries: { dir: path.join(__dirname, '/../../../../test/assets') },
        prefixes: {
          ds: 'http://semweb.mmlab.be/ns/datasummaries#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        },
      });
      baseUrl = await listen(DummyServer(controller));
    });

    it('should correctly serve summary in Turtle', async () => {
      let response = await fetch(baseUrl + '/summaries/summary', { headers: { Accept: 'text/turtle' } });
      let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.ttl'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/turtle;charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('public,max-age=604800');
      expect(await response.text()).toBe(summary);
    });

    it('should correctly serve summary in Trig', async () => {
      let response = await fetch(baseUrl + '/summaries/summary');
      let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.ttl'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/trig;charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('public,max-age=604800');
      expect(await response.text()).toBe(summary);
    });

    it('should correctly serve summary in ntriples', async () => {
      let response = await fetch(baseUrl + '/summaries/summary', { headers: { Accept: 'application/n-triples' } });
      let summary = fs.readFileSync(path.join(__dirname, '/../../../../test/assets/summary.nt'), 'utf8');
      expect(controller.next).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/n-triples;charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('public,max-age=604800');
      expect(await response.text()).toBe(summary);
    });

    it('should hand over to the next controller if no summary with that name is found', async () => {
      await fetch(baseUrl + '/summaries/unknown');
      expect(controller.next).toHaveBeenCalledOnce();
    });

    it('should hand over to the next controller for non-summary paths', async () => {
      await fetch(baseUrl + '/other');
      expect(controller.next).toHaveBeenCalledOnce();
    });
  });
});
