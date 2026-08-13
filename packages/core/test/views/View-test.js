/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
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
        let response = { getHeader: sinon.stub() };
        expect(() => { new View().render(null, null, response); })
          .toThrow('The _render method is not yet implemented.');
      });
    });

    describe('created without defaults', () => {
      it('should call _render with the given options', () => {
        let view = new View(),
            request = {}, response = { getHeader: sinon.stub().returns('text/html') },
            options = { a: 'b' };
        view._render = sinon.spy();
        view.render(options, request, response, noop);
        expect(response.getHeader.calledOnce).toBe(true);
        expect(response.getHeader.calledWith('Content-Type')).toBe(true);
        expect(view._render.getCall(0).args).toHaveLength(4);
        expect(view._render.calledOnce).toBe(true);
        expect(view._render.getCall(0).args[0]).toEqual({
          a: 'b',
          contentType: 'text/html',
          viewPathBase: resolve(__dirname, '../../lib/views/base.html'),
        });
        expect(view._render.getCall(0).args[1]).toBe(request);
        expect(view._render.getCall(0).args[2]).toBe(response);
        expect(view._render.getCall(0).args[3]).toBeInstanceOf(Function);
      });
    });

    describe('created with defaults', () => {
      it('should call _render with the combined defaults and options', () => {
        let view = new View(null, null, { c: 'd' }),
            request = {}, response = { getHeader: sinon.stub().returns('text/html') },
            options = { a: 'b' };
        view._render = sinon.spy();
        view.render(options, request, response, noop);
        expect(response.getHeader.calledOnce).toBe(true);
        expect(response.getHeader.calledWith('Content-Type')).toBe(true);
        expect(view._render.calledOnce).toBe(true);
        expect(view._render.getCall(0).args).toHaveLength(4);
        expect(view._render.getCall(0).args[0]).toEqual({
          a: 'b',
          c: 'd',
          contentType: 'text/html',
          viewPathBase: resolve(__dirname, '../../lib/views/base.html'),
        });
        expect(view._render.getCall(0).args[1]).toBe(request);
        expect(view._render.getCall(0).args[2]).toBe(response);
        expect(view._render.getCall(0).args[3]).toBeInstanceOf(Function);
      });
    });
  });
});

function noop() {}
