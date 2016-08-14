/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
/* A NotFoundRdfView represents a 404 response in HTML. */

var HtmlView = require('../HtmlView');

// Creates a new NotFoundHtmlView
function NotFoundHtmlView(settings) {
  if (!(this instanceof NotFoundHtmlView))
    return new NotFoundHtmlView(settings);
  HtmlView.call(this, 'NotFound', settings);
}
HtmlView.extend(NotFoundHtmlView);

// Renders the view with the given settings to the response
NotFoundHtmlView.prototype._render = function (settings, request, response, done) {
  this._renderTemplate('notfound/notfound', settings, request, response, done);
};

module.exports = NotFoundHtmlView;
