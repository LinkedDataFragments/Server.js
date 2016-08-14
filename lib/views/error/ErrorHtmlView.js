/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
/* An ErrorRdfView represents a 500 response in HTML. */

var HtmlView = require('../HtmlView');

// Creates a new ErrorHtmlView
function ErrorHtmlView(settings) {
  if (!(this instanceof ErrorHtmlView))
    return new ErrorHtmlView(settings);
  HtmlView.call(this, 'Error', settings);
}
HtmlView.extend(ErrorHtmlView);

// Renders the view with the given settings to the response
ErrorHtmlView.prototype._render = function (settings, request, response, done) {
  this._renderTemplate('error/error', settings, request, response, done);
};

module.exports = ErrorHtmlView;
