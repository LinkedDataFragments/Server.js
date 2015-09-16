/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A NotFoundController responds to requests that cannot be resolved */

var Controller = require('./Controller'),
    Util = require('../Util');

// Creates a new NotFoundController
function NotFoundController(options) {
  if (!(this instanceof NotFoundController))
    return new NotFoundController(options);
  Controller.call(this, options);
}
Controller.extend(NotFoundController);

// Serves a 404 response
NotFoundController.prototype._handleRequest = function (request, response) {
  // Cache 404 responses
  response.setHeader('Cache-Control', 'public,max-age=3600');

  // Try to write the 404 message using the appropriate writer
  var writerSettings = this._negotiateWriter(request, response);
  if (writerSettings) {
    var metadata = { url: request.url, prefixes: this._prefixes, datasources: this._datasources };
    response.writeHead(404, { 'Content-Type': writerSettings.mimeType });
    writerSettings.writer.writeNotFound(response, metadata);
  }
  // Write the 404 in plaintext if no writer was found
  else {
    response.writeHead(404, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end(request.url + ' not found');
  }
  return true;
};

module.exports = NotFoundController;
