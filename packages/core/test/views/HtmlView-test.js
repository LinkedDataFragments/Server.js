/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, vi } from 'vitest';
import { promisify } from 'util';
let HtmlView = require('../../lib/views/HtmlView').HtmlView,
    View = require('../../lib/views/View').View;

function response(write) {
  return {
    write: write || (() => {}),
    writeHead: () => {},
    getHeader: () => undefined,
    end: vi.fn(),
    emit: vi.fn(),
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
    it('should call done with an error when qejs fails to render', async () => {
      let view = new HtmlView('Error');
      let res = response();

      await expect(promisify(view._renderTemplate.bind(view))('error/error', {}, {}, res))
        .rejects.toBeInstanceOf(Error);
    });

    it('should initialize extension entries in the options for later use by the template', async () => {
      let view = new HtmlView('Error');
      function alreadyResolved() {}
      let options = { ...view._defaults, error: new Error('boom'), extensions: { Before: null, QuadBefore: 'function', After: alreadyResolved } };
      let res = response();

      await promisify(view._renderTemplate.bind(view))('error/error', options, {}, res);
      expect(options.extensions.Before).not.toBe(null);
      expect(typeof options.extensions.QuadBefore).toBe('function');
      expect(options.extensions.After).toBe(alreadyResolved);
    });

    it('should build a callable extension function that renders that extension\'s contents', async () => {
      let view = new HtmlView('Error');
      let options = { ...view._defaults, error: new Error('boom'), extensions: { QuadBefore: 'function' } };
      let res = response();

      await promisify(view._renderTemplate.bind(view))('error/error', options, {}, res);
      let contents = await options.extensions.QuadBefore({ some: 'data' });
      expect(contents).toBe('');
    });

    it('should accept an absolute template path', async () => {
      let view = new HtmlView('Error');
      let absolutePath = require('path').join(__dirname, '../../lib/views/error/error');
      let res = response((html) => {
        expect(html).toContain('Error executing your request');
      });

      await promisify(view._renderTemplate.bind(view))(absolutePath, { ...view._defaults, error: new Error('boom') }, {}, res);
    });
  });
});
