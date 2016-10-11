/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A ForbiddenHtmlView represents a 401 response in HTML. */

var HtmlView = require('../HtmlView');

// Creates a new ForbiddenHtmlView
function ForbiddenHtmlView(settings) {
  if (!(this instanceof ForbiddenHtmlView))
    return new ForbiddenHtmlView(settings);
  HtmlView.call(this, 'Forbidden', settings);
}
HtmlView.extend(ForbiddenHtmlView);

// Renders the view with the given settings to the response
ForbiddenHtmlView.prototype._render = function (settings, request, response, done) {
  this._renderTemplate('forbidden/forbidden', settings, request, response, done);
};

module.exports = ForbiddenHtmlView;
