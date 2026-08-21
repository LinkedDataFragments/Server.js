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
      function alreadyResolved() {}
      let options = { error: new Error('boom'), extensions: { Before: null, QuadBefore: 'function', After: alreadyResolved } };
      let res = response();

      view._renderTemplate('error/error', options, {}, res, () => {
        expect(options.extensions.Before).not.toBe(null);
        expect(typeof options.extensions.QuadBefore).toBe('function');
        expect(options.extensions.After).toBe(alreadyResolved);
        done();
      });
    }));

    it('should build a callable extension function that renders that extension\'s contents', () => new Promise((done) => {
      let view = new HtmlView('Error');
      let options = { error: new Error('boom'), extensions: { QuadBefore: 'function' } };
      let res = response();

      view._renderTemplate('error/error', options, {}, res, () => {
        options.extensions.QuadBefore({ some: 'data' }).then((contents) => {
          expect(contents).toBe('');
          done();
        });
      });
    }));

    it('should accept an absolute template path', () => new Promise((done) => {
      let view = new HtmlView('Error');
      let absolutePath = require('path').join(__dirname, '../../lib/views/error/error');
      let res = response((html) => {
        expect(html).toContain('Error executing your request');
      });

      view._renderTemplate(absolutePath, { error: new Error('boom') }, {}, res, () => {
        done();
      });
    }));
  });
});
