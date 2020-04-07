/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A NotFoundRdfView represents a 404 response in HTML. */

let HtmlView = require('../HtmlView');

// Creates a new NotFoundHtmlView
class NotFoundHtmlView extends HtmlView {
  constructor(settings) {
    super('NotFound', settings);
  }

  // Renders the view with the given settings to the response
  _render(settings, request, response, done) {
    this._renderTemplate('notfound/notfound', settings, request, response, done);
  }
}

module.exports = NotFoundHtmlView;
