/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
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
    view._renderTemplate = sinon.spy();
    let settings = {}, request = {}, response = {}, done = sinon.spy();

    view._render(settings, request, response, done);

    expect(view._renderTemplate.calledOnce).toBe(true);
    expect(view._renderTemplate.calledWith('notfound/notfound', settings, request, response, done)).toBe(true);
  });
});
