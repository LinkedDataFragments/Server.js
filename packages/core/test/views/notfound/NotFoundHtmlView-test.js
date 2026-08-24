/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect, vi } from 'vitest';
let NotFoundHtmlView = require('../../../lib/views/notfound/NotFoundHtmlView').NotFoundHtmlView,
    HtmlView = require('../../../lib/views/HtmlView').HtmlView;

describe('NotFoundHtmlView', () => {
  it('should be a function', () => {
    expect(typeof NotFoundHtmlView).toBe('function');
  });

  it('should be an HtmlView constructor', () => {
    expect(new NotFoundHtmlView()).toBeInstanceOf(HtmlView);
  });

  it('should render the notfound template', () => {
    let view = new NotFoundHtmlView();
    view._renderTemplate = vi.fn();
    let settings = {}, request = {}, response = {}, done = vi.fn();

    view._render(settings, request, response, done);

    expect(view._renderTemplate).toHaveBeenCalledOnce();
    expect(view._renderTemplate).toHaveBeenCalledWith('notfound/notfound', settings, request, response, done);
  });
});
