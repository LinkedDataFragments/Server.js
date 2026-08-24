/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
import { describe, it, expect, vi } from 'vitest';
let ForbiddenHtmlView = require('../../../lib/views/forbidden/ForbiddenHtmlView').ForbiddenHtmlView,
    HtmlView = require('../../../lib/views/HtmlView').HtmlView;

describe('ForbiddenHtmlView', () => {
  it('should be a function', () => {
    expect(typeof ForbiddenHtmlView).toBe('function');
  });

  it('should be an HtmlView constructor', () => {
    expect(new ForbiddenHtmlView()).toBeInstanceOf(HtmlView);
  });

  it('should render the forbidden template', () => {
    let view = new ForbiddenHtmlView();
    view._renderTemplate = vi.fn();
    let settings = {}, request = {}, response = {}, done = vi.fn();

    view._render(settings, request, response, done);

    expect(view._renderTemplate).toHaveBeenCalledOnce();
    expect(view._renderTemplate).toHaveBeenCalledWith('forbidden/forbidden', settings, request, response, done);
  });
});
