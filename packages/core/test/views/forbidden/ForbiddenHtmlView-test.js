/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
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
    view._renderTemplate = sinon.spy();
    let settings = {}, request = {}, response = {}, done = sinon.spy();

    view._render(settings, request, response, done);

    expect(view._renderTemplate.calledOnce).toBe(true);
    expect(view._renderTemplate.calledWith('forbidden/forbidden', settings, request, response, done)).toBe(true);
  });
});
