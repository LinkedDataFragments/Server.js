/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, vi } from 'vitest';
// changed to make tests pass, will be revised in follow up pr
let View = require('../../lib/views/View').View,
    resolve = require('path').resolve;

describe('View', () => {
  describe('The View module', () => {
    it('should be a function', () => {
      expect(typeof View).toBe('function');
    });

    it('should be a View constructor', () => {
      expect(new View()).toBeInstanceOf(View);
    });
  });

  describe('A View instance', () => {
    describe('created without a name', () => {
      it('should have the empty string as name', () => {
        expect(new View()).toHaveProperty('name', '');
      });
    });

    describe('created with a name', () => {
      it('should set the name', () => {
        expect(new View('MyView')).toHaveProperty('name', 'MyView');
      });
    });

    describe('created without a name', () => {
      it('should have the empty string as name', () => {
        expect(new View()).toHaveProperty('name', '');
      });
    });

    describe('created without content types', () => {
      it('should have an empty array as supported content types', () => {
        expect(new View().supportedContentTypes).toEqual([]);
      });
    });

    describe('created with one content type', () => {
      it('should have an array with the supported content types', () => {
        expect(new View('', 'text/html').supportedContentTypes).toEqual([
          { type: 'text/html', responseType: 'text/html;charset=utf-8', quality: 1 },
        ]);
      });
    });

    describe('created with two content types', () => {
      it('should have an array with the supported content types', () => {
        expect(new View('', 'text/html,text/plain').supportedContentTypes).toEqual([
          { type: 'text/html',  responseType: 'text/html;charset=utf-8', quality: 1 },
          { type: 'text/plain', responseType: 'text/plain;charset=utf-8', quality: 1 },
        ]);
      });
    });

    describe('created with two content types with a quality parameter', () => {
      it('should have an array with the supported content types', () => {
        expect(new View('', 'text/html,text/plain;q=0.4').supportedContentTypes).toEqual([
          { type: 'text/html',  responseType: 'text/html;charset=utf-8',  quality: 1 },
          { type: 'text/plain', responseType: 'text/plain;charset=utf-8', quality: 0.4 },
        ]);
      });
    });

    describe('without _render method', () => {
      it('should throw an error on calling render', () => {
        let response = { getHeader: vi.fn() };
        expect(() => { new View().render(null, null, response); })
          .toThrow('The _render method is not yet implemented.');
      });
    });

    describe('created without defaults', () => {
      it('should call _render with the given options', () => {
        let view = new View(),
            request = {}, response = { getHeader: vi.fn().mockReturnValue('text/html') },
            options = { a: 'b' };
        view._render = vi.fn();
        view.render(options, request, response, noop);
        expect(response.getHeader).toHaveBeenCalledOnce();
        expect(response.getHeader).toHaveBeenCalledWith('Content-Type');
        expect(view._render.mock.calls[0]).toHaveLength(4);
        expect(view._render).toHaveBeenCalledOnce();
        expect(view._render.mock.calls[0][0]).toEqual({
          a: 'b',
          contentType: 'text/html',
          viewPathBase: resolve(__dirname, '../../lib/views/base.html'),
        });
        expect(view._render.mock.calls[0][1]).toBe(request);
        expect(view._render.mock.calls[0][2]).toBe(response);
        expect(view._render.mock.calls[0][3]).toBeInstanceOf(Function);
      });
    });

    describe('created with defaults', () => {
      it('should call _render with the combined defaults and options', () => {
        let view = new View(null, null, { c: 'd' }),
            request = {}, response = { getHeader: vi.fn().mockReturnValue('text/html') },
            options = { a: 'b' };
        view._render = vi.fn();
        view.render(options, request, response, noop);
        expect(response.getHeader).toHaveBeenCalledOnce();
        expect(response.getHeader).toHaveBeenCalledWith('Content-Type');
        expect(view._render).toHaveBeenCalledOnce();
        expect(view._render.mock.calls[0]).toHaveLength(4);
        expect(view._render.mock.calls[0][0]).toEqual({
          a: 'b',
          c: 'd',
          contentType: 'text/html',
          viewPathBase: resolve(__dirname, '../../lib/views/base.html'),
        });
        expect(view._render.mock.calls[0][1]).toBe(request);
        expect(view._render.mock.calls[0][2]).toBe(response);
        expect(view._render.mock.calls[0][3]).toBeInstanceOf(Function);
      });
    });

    describe('when _render calls back with an error', () => {
      it('should emit an error event on the response before ending it', () => {
        let view = new View(),
            request = {}, response = { getHeader: vi.fn().mockReturnValue('text/html'), emit: vi.fn(), end: vi.fn() },
            error = new Error('render failed');
        view._render = (settings, req, res, done) => done(error);

        view.render({}, request, response, noop);

        expect(response.emit).toHaveBeenCalledWith('error', error);
        expect(response.end).toHaveBeenCalledOnce();
      });
    });

    describe('with view extensions', () => {
      it('should render only the extensions that support the requested content type, in order', () => {
        let rendered = [];
        function extension(name, contentTypes) {
          let ext = new View(name, contentTypes);
          ext._render = (settings, request, response, done) => { rendered.push(name); done(); };
          return ext;
        }
        let htmlExt = extension('ParentView:Before', 'text/html'),
            jsonExt = extension('ParentView:Before', 'application/json');
        let view = new View('ParentView', null, { views: [htmlExt, jsonExt] });
        let response = { getHeader: vi.fn().mockReturnValue('text/html'), emit: vi.fn(), end: vi.fn() };
        let done = vi.fn();

        view._renderViewExtensions('Before', { contentType: 'text/html' }, {}, response, done);

        expect(rendered).toEqual(['ParentView:Before']);
        expect(done).toHaveBeenCalledOnce();
      });

      it('should call done directly when there are no matching extensions', () => {
        let view = new View('ParentView');
        let done = vi.fn();

        view._renderViewExtensions('Before', { contentType: 'text/html' }, {}, {}, done);

        expect(done).toHaveBeenCalledOnce();
      });
    });

    describe('_renderViewExtension', () => {
      it('should render the extension with the given options', () => {
        let view = new View();
        let extension = new View('Ext', 'text/html');
        extension._render = vi.fn();
        let request = {}, response = { getHeader: vi.fn().mockReturnValue('text/html'), emit: vi.fn(), end: vi.fn() };
        let done = vi.fn();

        view._renderViewExtension(extension, { contentType: 'text/html' }, request, response, done);

        expect(extension._render).toHaveBeenCalledOnce();
      });
    });
  });
});

function noop() {}
