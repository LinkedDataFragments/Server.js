/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

import { describe, it, expect, vi } from 'vitest';
import { View } from '../../lib/views/View';
import { resolve } from 'path';
import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '../../index';

// View marks _render protected so subclasses can implement it. This subclass
// widens it to public so this suite can mock/spy on the base class's own
// behavior directly, the way its subclasses already do.
class TestableView extends View {
  override _render(settings: ViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    return super._render(settings, request, response, done);
  }
}

function createRequest(): LdfRequest {
  return new IncomingMessage(new Socket());
}

function createResponse(): LdfResponse {
  return new ServerResponse(createRequest());
}

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
        let response = createResponse();
        response.getHeader = vi.fn();
        expect(() => { new View().render({}, createRequest(), response); })
          .toThrow('The _render method is not yet implemented.');
      });
    });

    describe('created without defaults', () => {
      it('should call _render with the given options', () => {
        let view = new TestableView(),
            request = createRequest(), response = createResponse(),
            options = { a: 'b' };
        response.getHeader = vi.fn().mockReturnValue('text/html');
        let renderSpy = vi.fn();
        view._render = renderSpy;
        view.render(options, request, response, noop);
        expect(response.getHeader).toHaveBeenCalledOnce();
        expect(response.getHeader).toHaveBeenCalledWith('Content-Type');
        expect(renderSpy.mock.calls[0]).toHaveLength(4);
        expect(renderSpy).toHaveBeenCalledOnce();
        expect(renderSpy.mock.calls[0][0]).toEqual({
          a: 'b',
          contentType: 'text/html',
          viewPathBase: resolve(__dirname, '../../lib/views/base.html'),
        });
        expect(renderSpy.mock.calls[0][1]).toBe(request);
        expect(renderSpy.mock.calls[0][2]).toBe(response);
        expect(renderSpy.mock.calls[0][3]).toBeInstanceOf(Function);
      });
    });

    describe('created with defaults', () => {
      it('should call _render with the combined defaults and options', () => {
        let view = new TestableView(undefined, undefined, { c: 'd' }),
            request = createRequest(), response = createResponse(),
            options = { a: 'b' };
        response.getHeader = vi.fn().mockReturnValue('text/html');
        let renderSpy = vi.fn();
        view._render = renderSpy;
        view.render(options, request, response, noop);
        expect(response.getHeader).toHaveBeenCalledOnce();
        expect(response.getHeader).toHaveBeenCalledWith('Content-Type');
        expect(renderSpy).toHaveBeenCalledOnce();
        expect(renderSpy.mock.calls[0]).toHaveLength(4);
        expect(renderSpy.mock.calls[0][0]).toEqual({
          a: 'b',
          c: 'd',
          contentType: 'text/html',
          viewPathBase: resolve(__dirname, '../../lib/views/base.html'),
        });
        expect(renderSpy.mock.calls[0][1]).toBe(request);
        expect(renderSpy.mock.calls[0][2]).toBe(response);
        expect(renderSpy.mock.calls[0][3]).toBeInstanceOf(Function);
      });
    });
  });
});

function noop() {}
