/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* A ForbiddenHtmlView represents a 401 response in HTML. */

let HtmlView = require('../HtmlView');

// Creates a new ForbiddenHtmlView
class ForbiddenHtmlView extends HtmlView {
  constructor(settings) {
    super('Forbidden', settings);
  }

  // Renders the view with the given settings to the response
  _render(settings, request, response, done) {
    this._renderTemplate('forbidden/forbidden', settings, request, response, done);
  }
}

module.exports = ForbiddenHtmlView;
