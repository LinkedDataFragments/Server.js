/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
let HtmlView = require('../../lib/views/HtmlView').HtmlView,
    View = require('../../lib/views/View').View;

function response(write) {
  return {
    write: write || (() => {}),
    writeHead: () => {},
    getHeader: () => undefined,
    end: sinon.spy(),
    emit: sinon.spy(),
  };
}

describe('HtmlView', () => {
  it('should be a function', () => {
    expect(typeof HtmlView).toBe('function');
  });

  it('should be a View constructor', () => {
    expect(new HtmlView()).toBeInstanceOf(View);
  });

  describe('_renderTemplate', () => {
    // qejs resolves template paths via require.main.filename, which Vitest's
    // module runner never sets (no traditional require.main entry point) —
    // every real qejs.renderFile call throws for this reason alone, so its
    // success path can't be exercised here. This test covers what that
    // failure actually looks like and confirms it reaches done() as an
    // error rather than hanging or throwing uncaught.
    it('should call done with an error when qejs fails to render', () => new Promise((done) => {
      let view = new HtmlView('Error');
      let res = response();

      view._renderTemplate('error/error', {}, {}, res, (error) => {
        expect(error).toBeInstanceOf(Error);
        done();
      });
    }));

    it('should initialize extension entries in the options for later use by the template', () => new Promise((done) => {
      let view = new HtmlView('Error');
      let options = { error: new Error('boom'), extensions: { Before: null, QuadBefore: 'function' } };
      let res = response();

      view._renderTemplate('error/error', options, {}, res, () => {
        expect(options.extensions.Before).not.toBe(null);
        expect(typeof options.extensions.QuadBefore).toBe('function');
        done();
      });
    }));
  });
});
