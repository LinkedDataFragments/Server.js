/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorRdfView represents a 500 response in HTML. */

var HtmlView = require('../HtmlView');

// Creates a new ErrorHtmlView
class ErrorHtmlView extends HtmlView {
  constructor(settings) {
    super('Error', settings);
  }
}
HtmlView.extend(ErrorHtmlView);

// Renders the view with the given settings to the response
ErrorHtmlView.prototype._render = function (settings, request, response, done) {
  this._renderTemplate('error/error', settings, request, response, done);
};

module.exports = ErrorHtmlView;
