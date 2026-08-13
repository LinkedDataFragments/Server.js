/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
const sinon = require('sinon');
let ErrorHtmlView = require('../../../lib/views/error/ErrorHtmlView').ErrorHtmlView,
    HtmlView = require('../../../lib/views/HtmlView').HtmlView;

describe('ErrorHtmlView', () => {
  it('should be a function', () => {
    expect(typeof ErrorHtmlView).toBe('function');
  });

  it('should be an HtmlView constructor', () => {
    expect(new ErrorHtmlView()).toBeInstanceOf(HtmlView);
  });

  it('should render the error template', () => {
    let view = new ErrorHtmlView();
    view._renderTemplate = sinon.spy();
    let settings = {}, request = {}, response = {}, done = sinon.spy();

    view._render(settings, request, response, done);

    expect(view._renderTemplate.calledOnce).toBe(true);
    expect(view._renderTemplate.calledWith('error/error', settings, request, response, done)).toBe(true);
  });
});
