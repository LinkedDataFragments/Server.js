/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A NotFoundController responds to requests that cannot be resolved */

let Controller = require('./Controller'),
    Util = require('../Util');

// Creates a new NotFoundController
class NotFoundController extends Controller {
  constructor(options) {
    super(options);
    this._last = true;
  }

  // Serves a 404 response
  _handleRequest(request, response, next) {
    // Cache 404 responses
    response.setHeader('Cache-Control', 'public,max-age=3600');

    // Render the 404 message using the appropriate view
    let view = this._negotiateView('NotFound', request, response),
        metadata = { url: request.url, prefixes: this._prefixes, datasources: this._datasources };
    response.writeHead(404);
    view.render(metadata, request, response);
  }

  // Writes the 404 in plaintext if no view was found
  _handleNotAcceptable(request, response, next) {
    response.writeHead(404, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end(request.url + ' not found\n');
  }
}

module.exports = NotFoundController;
