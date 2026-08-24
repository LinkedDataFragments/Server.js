/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */

import { describe, it, expect, vi } from 'vitest';
const path = require('path');
const AsyncIterator = require('asynciterator');
let QuadPatternFragmentsHtmlView = require('../../../').views.quadpatternfragments.QuadPatternFragmentsHtmlView;

describe('QuadPatternFragmentsHtmlView', () => {
  describe('The QuadPatternFragmentsHtmlView module', () => {
    it('should be a function', () => {
      expect(typeof QuadPatternFragmentsHtmlView).toBe('function');
    });

    it('should be a QuadPatternFragmentsHtmlView constructor', () => {
      expect(new QuadPatternFragmentsHtmlView()).toBeInstanceOf(QuadPatternFragmentsHtmlView);
    });

    it('should set viewDirectory to its own directory', () => {
      let view = new QuadPatternFragmentsHtmlView();
      expect(view.viewDirectory).toBe(path.join(__dirname, '../../../lib/views/quadpatternfragments'));
    });
  });

  describe('_render', () => {
    function render(datasource, resultsFactory) {
      let view = new QuadPatternFragmentsHtmlView();
      let renderTemplate = vi.fn((template, settings, request, response, done) => done());
      view._renderTemplate = renderTemplate;
      let results = resultsFactory();
      let settings = { datasource, query: {}, results };
      let { promise, resolve } = Promise.withResolvers();
      view._render(settings, {}, {}, () => resolve({ renderTemplate, settings }));
      results.setProperty('metadata', { totalCount: 0 });
      return promise;
    }

    it('should render the datasource template for a non-index datasource', async () => {
      let { renderTemplate } = await render({}, AsyncIterator.empty);
      expect(renderTemplate).toHaveBeenCalledOnce();
      expect(renderTemplate.mock.calls[0][0]).toContain('datasource');
      expect(renderTemplate.mock.calls[0][0]).not.toContain('index.');
    });

    it('should render the index template for an index datasource', async () => {
      let { renderTemplate } = await render({ role: 'index' }, AsyncIterator.empty);
      expect(renderTemplate).toHaveBeenCalledOnce();
      expect(renderTemplate.mock.calls[0][0]).toMatch(/index$/);
    });

    it('should collect quads from the results stream into settings.quads', async () => {
      let { settings } = await render({}, () => AsyncIterator.fromArray([{ subject: 'a' }, { subject: 'b' }]));
      expect(settings.quads).toEqual([{ subject: 'a' }, { subject: 'b' }]);
    });

    it('should set the extension points used by templates before rendering', async () => {
      let { settings } = await render({}, AsyncIterator.empty);
      expect(settings.extensions).toEqual({
        Before: null, FormBefore: null, FormAfter: null,
        QuadBefore: 'function', QuadAfter: 'function', After: null,
      });
    });

    it('should render only once, whether metadata arrives before or after the stream ends', async () => {
      let view = new QuadPatternFragmentsHtmlView();
      let renderTemplate = vi.fn((template, settings, request, response, done) => done());
      view._renderTemplate = renderTemplate;
      let results = new AsyncIterator.TransformIterator();
      let settings = { datasource: {}, query: {}, results };

      let { promise, resolve } = Promise.withResolvers();
      view._render(settings, {}, {}, resolve);
      results.source = AsyncIterator.empty();
      setImmediate(() => { results.setProperty('metadata', { totalCount: 5 }); });
      await promise;
      expect(renderTemplate).toHaveBeenCalledOnce();
    });
  });
});
