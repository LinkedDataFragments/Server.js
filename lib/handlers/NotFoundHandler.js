/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A NotFoundHandler responds to requests that cannot be resolved */

var url = require('url'),
    RequestHandler = require('./RequestHandler'),
    Util = require('../Util');

// Creates a new NotFoundHandler
function NotFoundHandler(options) {
  if (!(this instanceof NotFoundHandler))
    return new NotFoundHandler(options);
  RequestHandler.call(this, options);
}
RequestHandler.extend(NotFoundHandler);

// Serves a 404 response
NotFoundHandler.prototype.handleRequest = function (request, response) {
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

module.exports = NotFoundHandler;
