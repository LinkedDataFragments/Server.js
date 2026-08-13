/*! @license MIT ©2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
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

  describe('_render', () => {
    it('should call done without rendering when the datasource has no memento', () => {
      let instance = view({ id: 'ds1' });
      instance._renderTemplate = sinon.spy();
      let done = sinon.spy();

      instance._render({ datasource: { id: 'ds2' } }, {}, {}, done);

      expect(instance._renderTemplate.called).toBe(false);
      expect(done.calledOnce).toBe(true);
    });

    it('should render the memento details when the datasource has one', () => {
      let instance = view({ id: 'ds1' });
      instance._renderTemplate = sinon.spy();
      let done = sinon.spy();

      instance._render({ datasource: { id: 'ds1' } }, {}, {}, done);

      expect(instance._renderTemplate.calledOnce).toBe(true);
      expect(instance._renderTemplate.getCall(0).args[1]).toEqual({
        start: new Date('2020-01-01T00:00:00Z'),
        end: new Date('2020-06-01T00:00:00Z'),
      });
    });
  });
});
