/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** RequestHandler is a base class for HTTP request handlers */

var negotiate = require('negotiate'),
    Util = require('../Util');

// Creates a new RequestHandler
function RequestHandler(options) {
  if (!(this instanceof RequestHandler))
    return new RequestHandler(options);
  // Load common options
  options = options || {};
  this._datasources = options.datasources || {};

  // Set up content negotiation
  this._prefixes = options.prefixes || {};
  this._writers = this._parseWriters(options.writers);
}

// Makes RequestHandler the prototype of the given class
RequestHandler.extend = function extend(child) {
  child.prototype = Object.create(this.prototype);
  child.prototype.constructor = child;
  child.extend = extend;
};

// Parses a list of writers per type into an ordered list for content negotiation
RequestHandler.prototype._parseWriters = function (writers) {
  var writerList = [];
  for (var mimeTypes in writers) {
    // The object value is a writer, the key is a list of MIME types
    var writer = writers[mimeTypes];
    mimeTypes = mimeTypes.split(/[,;]/);
    // Create a settings object for each writer
    mimeTypes.forEach(function (mimeType, index) {
      var isUniversalType = mimeType === '*/*',
          specificType = isUniversalType ? (mimeTypes[index ? 0 : 1] || 'text/plain') : mimeType,
          isTextualType = /^text\/|\/(?:json|xml)$/.test(specificType);
      writerList.push({
        writer: writer,
        type: mimeType, // for content negotiation
        mimeType: isTextualType ? specificType + ';charset=utf-8' : specificType, // for response
        quality: isUniversalType ? 1.0 : 0.8,
      });
    });
  }
  return writerList;
};

// Tries to serve the request
RequestHandler.prototype.handleRequest = function (request, response) {
  return false;
};

// Finds an appropriate request writer through content negotiation
RequestHandler.prototype._negotiateWriter = function (request, response, mandatory) {
  var writer = negotiate.choose(this._writers, request)[0];
  response.setHeader('Vary', 'Accept');
  if (mandatory && !writer)
    this._sendError(request, response, new Error('No suitable content type found.'), 406);
  return writer;
};

// Serves an application error
RequestHandler.prototype._sendError = function (request, response, error, status, writerSettings) {
  // We cannot safely change an already started response, so close the stream
  if (response.headersSent) {
    response.end();
  }
  // Try to write a proper error response
  else if (writerSettings && writerSettings.writer) {
    var metadata = { prefixes: this._prefixes, datasources: this._datasources };
    response.writeHead(status || 500, { 'Content-Type': writerSettings.mimeType || Util.MIME_PLAINTEXT });
    writerSettings.writer.writeError(response, error, metadata);
  }
  // Finally, try to write a plaintext error response
  else {
    response.writeHead(status || 500, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('Application error: ' + error.message);
  }
};

// Cleans resources used by the request handler
RequestHandler.prototype.close = function () { };

module.exports = RequestHandler;
