/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, vi } from 'vitest';
let SummaryHtmlViewExtension = require('../../../lib/views/summary/QuadPatternFragmentsHtmlView-Summary.js').SummaryHtmlViewExtension;
let SummaryRdfViewExtension = require('../../../lib/views/summary/QuadPatternFragmentsRdfView-Summary.js').SummaryRdfViewExtension;

let dataFactory = require('n3').DataFactory;

describe('SummaryHtmlViewExtension', () => {
  it('should be a function', () => {
    expect(typeof SummaryHtmlViewExtension).toBe('function');
  });

  describe('_render', () => {
    it('should call done without rendering when summaries are not configured', () => {
      let view = new SummaryHtmlViewExtension();
      view._renderTemplate = vi.fn();
      let done = vi.fn();

      view._render({ query: {} }, {}, {}, done);

      expect(view._renderTemplate).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledOnce();
    });

    // TODO: the baseURL/query.datasource guard was dropped, so this renders
    // an "undefinedsummariesundefined"-style URL instead of skipping.
    it('should still render (with a broken URL) when baseURL or the datasource query param is missing', () => {
      let view = new SummaryHtmlViewExtension();
      view._renderTemplate = vi.fn();
      let done = vi.fn();

      view._render({ summaries: { dir: '/summaries' }, query: {} }, {}, {}, done);

      expect(view._renderTemplate).toHaveBeenCalled();
      expect(view._renderTemplate.mock.calls[0][1].summary.url).toBe('undefinedsummariesundefined');
    });

    it('should render the summary link when summaries are configured with a dir', () => {
      let view = new SummaryHtmlViewExtension();
      view._renderTemplate = vi.fn();
      let settings = { summaries: { dir: '/summaries' }, baseURL: 'http://example.org/', query: { datasource: 'ds1' } };

      view._render(settings, {}, {}, () => {});

      expect(view._renderTemplate).toHaveBeenCalledOnce();
      expect(settings.summary).toEqual({ url: 'http://example.org/summariesds1' });
    });

    it('should render the summary link when summaries are configured with a path instead of a dir', () => {
      let view = new SummaryHtmlViewExtension();
      view._renderTemplate = vi.fn();
      let settings = { summaries: { path: '/summaries' }, baseURL: 'http://example.org/', query: { datasource: 'ds1' } };

      view._render(settings, {}, {}, () => {});

      expect(view._renderTemplate).toHaveBeenCalledOnce();
    });
  });
});

describe('SummaryRdfViewExtension', () => {
  it('should be a function', () => {
    expect(typeof SummaryRdfViewExtension).toBe('function');
  });

  describe('_generateRdf', () => {
    it('should call done without emitting metadata when summaries are not configured', () => {
      let view = new SummaryRdfViewExtension({ dataFactory });
      let metadata = vi.fn(), done = vi.fn();

      view._generateRdf({ datasource: {}, query: {} }, () => {}, metadata, done);

      expect(metadata).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledOnce();
    });

    it('should call done without emitting metadata when the datasource has no url', () => {
      let view = new SummaryRdfViewExtension({ dataFactory });
      let metadata = vi.fn(), done = vi.fn();

      view._generateRdf({ summaries: { dir: '/summaries' }, datasource: {}, baseURL: 'http://example.org/', query: { datasource: 'ds1' } },
        () => {}, metadata, done);

      expect(metadata).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledOnce();
    });

    it('should emit a hasDatasetSummary metadata triple when summaries are configured', () => {
      let view = new SummaryRdfViewExtension({ dataFactory });
      let metadata = vi.fn(), done = vi.fn();

      view._generateRdf({
        summaries: { dir: '/summaries' },
        datasource: { url: 'http://example.org/ds1#dataset' },
        baseURL: 'http://example.org/',
        query: { datasource: 'ds1' },
      }, () => {}, metadata, done);

      expect(metadata).toHaveBeenCalledOnce();
      let quad = metadata.mock.calls[0][0];
      expect(quad.subject.value).toBe('http://example.org/ds1#dataset');
      expect(quad.predicate.value).toBe('http://semweb.mmlab.be/ns/datasummaries#hasDatasetSummary');
      expect(quad.object.value).toBe('http://example.org/summaries/ds1');
      expect(done).toHaveBeenCalledOnce();
    });
  });
});
