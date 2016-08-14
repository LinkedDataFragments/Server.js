/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
/* An ErrorController responds to requests that caused an error */

var Controller = require('./Controller'),
    Util = require('../Util');

// Creates a new ErrorController
function ErrorController(options) {
  if (!(this instanceof ErrorController))
    return new ErrorController(options);
  Controller.call(this, options);
}
Controller.extend(ErrorController);

// Serves an error response
ErrorController.prototype._handleRequest = function (request, response, next) {
  // Try to write an error response through an appropriate view
  var error = response.error || (response.error = new Error('Unknown error')),
      view = this._negotiateView('Error', request, response),
      metadata = { prefixes: this._prefixes, datasources: this._datasources, error: error };
  response.writeHead(500);
  view.render(metadata, request, response);
};

// Writes the error in plaintext if no view was found
ErrorController.prototype._handleNotAcceptable = function (request, response, next) {
  response.writeHead(500, { 'Content-Type': Util.MIME_PLAINTEXT });
  response.end('Application error: ' + response.error.message + '\n');
};

module.exports = ErrorController;
