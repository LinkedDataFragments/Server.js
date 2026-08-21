/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */

import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
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
      let renderTemplate = sinon.spy((template, settings, request, response, done) => done());
      view._renderTemplate = renderTemplate;
      let results = resultsFactory();
      let settings = { datasource, query: {}, results };
      return new Promise((resolve) => {
        view._render(settings, {}, {}, () => resolve({ renderTemplate, settings }));
        results.setProperty('metadata', { totalCount: 0 });
      });
    }

    it('should render the datasource template for a non-index datasource', () => {
      return render({}, AsyncIterator.empty).then(({ renderTemplate }) => {
        expect(renderTemplate.calledOnce).toBe(true);
        expect(renderTemplate.getCall(0).args[0]).toContain('datasource');
        expect(renderTemplate.getCall(0).args[0]).not.toContain('index.');
      });
    });

    it('should render the index template for an index datasource', () => {
      return render({ role: 'index' }, AsyncIterator.empty).then(({ renderTemplate }) => {
        expect(renderTemplate.calledOnce).toBe(true);
        expect(renderTemplate.getCall(0).args[0]).toMatch(/index$/);
      });
    });

    it('should collect quads from the results stream into settings.quads', () => {
      return render({}, () => AsyncIterator.fromArray([{ subject: 'a' }, { subject: 'b' }])).then(({ settings }) => {
        expect(settings.quads).toEqual([{ subject: 'a' }, { subject: 'b' }]);
      });
    });

    it('should set the extension points used by templates before rendering', () => {
      return render({}, AsyncIterator.empty).then(({ settings }) => {
        expect(settings.extensions).toEqual({
          Before: null, FormBefore: null, FormAfter: null,
          QuadBefore: 'function', QuadAfter: 'function', After: null,
        });
      });
    });

    it('should render only once, whether metadata arrives before or after the stream ends', () => {
      let view = new QuadPatternFragmentsHtmlView();
      let renderTemplate = sinon.spy((template, settings, request, response, done) => done());
      view._renderTemplate = renderTemplate;
      let results = new AsyncIterator.TransformIterator();
      let settings = { datasource: {}, query: {}, results };

      return new Promise((resolve) => {
        view._render(settings, {}, {}, resolve);
        results.source = AsyncIterator.empty();
        setImmediate(() => { results.setProperty('metadata', { totalCount: 5 }); });
      }).then(() => {
        expect(renderTemplate.calledOnce).toBe(true);
      });
    });
  });
});
