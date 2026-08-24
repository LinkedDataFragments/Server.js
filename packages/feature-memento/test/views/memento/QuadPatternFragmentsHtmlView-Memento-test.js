/*! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, vi } from 'vitest';
let MementoHtmlViewExtension = require('../../../lib/views/memento/QuadPatternFragmentsHtmlView-Memento.js').MementoHtmlViewExtension;
let UrlData = require('@ldf/core').UrlData;

function view(datasource) {
  return new MementoHtmlViewExtension({
    urlData: new UrlData({ baseURL: 'http://example.org/' }),
    timegates: {
      mementos: {
        resource: [{ datasource: datasource, initial: '2020-01-01T00:00:00Z', final: '2020-06-01T00:00:00Z' }],
      },
    },
  });
}

describe('MementoHtmlViewExtension', () => {
  it('should be a function', () => {
    expect(typeof MementoHtmlViewExtension).toBe('function');
  });

  it('should construct with an empty inverted timegate map when no timegates are configured', () => {
    let instance = new MementoHtmlViewExtension({ urlData: new UrlData() });
    expect(instance._invertedTimegateMap).toEqual({});
  });

  describe('_render', () => {
    it('should call done without rendering when the datasource has no memento', () => {
      let instance = view({ id: 'ds1' });
      instance._renderTemplate = vi.fn();
      let done = vi.fn();

      instance._render({ datasource: { id: 'ds2' } }, {}, {}, done);

      expect(instance._renderTemplate).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledOnce();
    });

    it('should render the memento details when the datasource has one', () => {
      let instance = view({ id: 'ds1' });
      instance._renderTemplate = vi.fn();
      let done = vi.fn();

      instance._render({ datasource: { id: 'ds1' } }, {}, {}, done);

      expect(instance._renderTemplate).toHaveBeenCalledOnce();
      expect(instance._renderTemplate.mock.calls[0][1]).toEqual({
        start: new Date('2020-01-01T00:00:00Z'),
        end: new Date('2020-06-01T00:00:00Z'),
      });
    });
  });
});
