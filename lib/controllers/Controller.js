/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** Controller is a base class for HTTP request handlers */

var url = require('url'),
    _ = require('lodash'),
    negotiate = require('negotiate'),
    ViewCollection = require('../views/ViewCollection'),
    Util = require('../Util');

// Creates a new Controller
function Controller(options) {
  if (!(this instanceof Controller))
    return new Controller(options);
  // Load common options
  options = options || {};
  this._datasources = options.datasources || {};

  // Set up base URL (if we're behind a proxy, this allows reconstructing the actual request URL)
  this._baseUrl = _.mapValues(url.parse(options.baseURL || '/'), function (value, key) {
    return value && !/^(?:href|path|search|hash)$/.test(key) ? value : undefined;
  });

  // Set up views
  this._views = options.views && options.views.getView ?
                options.views : new ViewCollection(options.views);

  // Set up content negotiation
  this._prefixes = options.prefixes || {};
  this._writers = this._parseWriters(options.writers);
}

// Makes Controller the prototype of the given class
Controller.extend = function extend(child) {
  child.prototype = Object.create(this.prototype);
  child.prototype.constructor = child;
  child.extend = extend;
};

// Parses a list of writers per type into an ordered list for content negotiation
Controller.prototype._parseWriters = function (writers) {
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

// Tries to process the HTTP request
Controller.prototype.handleRequest = function (request, response) {
  // Add a `parsedUrl` field to `request`,
  // containing the parsed request URL, resolved against the base URL
  if (!request.parsedUrl)
    // Keep the request's path and query, but take over all other defined baseURL properties
    request.parsedUrl = _.defaults(_.pick(url.parse(request.url, true), 'path', 'pathname', 'query'),
                                   this._baseUrl, { protocol: 'http:', host: request.headers.host });

  // Set up response error handling
  var self = this;
  response.once('error', handleError);
  function handleError(error) {
    if (self) {
      var handled = false;
      // Send a 406 response if no suitable view was found
      if (error instanceof ViewCollection.ViewCollectionError)
        handled = self._handleNotAcceptable(request, response);
      // Otherwise, send the error as-is
      else
        handled = self._handleErrorMessage(request, response, error);
      self = null;
      return handled;
    }
  }

  // Try to handle the request
  try { return this._handleRequest(request, response); }
  catch (error) { return handleError(error); }
};

// Tries to process the HTTP request in an implementation-specific way
Controller.prototype._handleRequest = function (request, response) {
  return false;
};

// Finds an appropriate request writer through content negotiation
Controller.prototype._negotiateWriter = function (request, response, mandatory) {
  var writer = negotiate.choose(this._writers, request)[0];
  response.setHeader('Vary', 'Accept');
  if (mandatory && !writer)
    this._handleErrorMessage(request, response, new Error('No suitable content type found.'), 406);
  return writer;
};

// Finds an appropriate view using content negotiation
Controller.prototype._negotiateView = function (viewName, request, response) {
  // Indicate that the response is content-negotiated
  response.setHeader('Vary', 'Accept');
  // Negotiate a view
  var viewDetails = this._views.getView(viewName, request);
  response.setHeader('Content-Type', viewDetails.responseType || viewDetails.type);
  return viewDetails.view;
};

// Serves an error indicating content negotiation failure
Controller.prototype._handleNotAcceptable = function (request, response) {
  return this._handleErrorMessage(request, response, new Error('No suitable content type found.'), 406);
};

// Serves an application error
Controller.prototype._handleErrorMessage = function (request, response, error, status, writerSettings) {
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
    response.end('Application error: ' + error.message + '\n');
  }
  return true;
};

// Cleans resources used by the controller
Controller.prototype.close = function () { };

module.exports = Controller;
