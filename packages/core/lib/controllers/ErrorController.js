/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An ErrorController responds to requests that caused an error */

let Controller = require('./Controller'),
    Util = require('../Util');

// Creates a new ErrorController
class ErrorController extends Controller {
  constructor(options) {
    super(options);
  }

  // Serves an error response
  _handleRequest(request, response, next) {
    // Try to write an error response through an appropriate view
    let error = response.error || (response.error = new Error('Unknown error')),
        view = this._negotiateView('Error', request, response),
        metadata = { prefixes: this._prefixes, datasources: this._datasources, error: error };
    response.writeHead(500);
    view.render(metadata, request, response);
  }

  // Writes the error in plaintext if no view was found
  _handleNotAcceptable(request, response, next) {
    response.writeHead(500, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('Application error: ' + response.error.message + '\n');
  }
}

module.exports = ErrorController;
