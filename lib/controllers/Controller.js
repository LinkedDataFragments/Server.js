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
  options = options || {};
  this._prefixes = options.prefixes || {};
  this._datasources = options.datasources || {};
  this._views = options.views && options.views.getView ?
                options.views : new ViewCollection(options.views);

  // Set up base URL (if we're behind a proxy, this allows reconstructing the actual request URL)
  this._baseUrl = _.mapValues(url.parse(options.baseURL || '/'), function (value, key) {
    return value && !/^(?:href|path|search|hash)$/.test(key) ? value : undefined;
  });
}

// Makes Controller the prototype of the given class
Controller.extend = function extend(child) {
  child.prototype = Object.create(this.prototype);
  child.prototype.constructor = child;
  child.extend = extend;
};

// Tries to process the HTTP request
Controller.prototype.handleRequest = function (request, response, next) {
  // Add a `parsedUrl` field to `request`,
  // containing the parsed request URL, resolved against the base URL
  if (!request.parsedUrl)
    // Keep the request's path and query, but take over all other defined baseURL properties
    request.parsedUrl = _.defaults(_.pick(url.parse(request.url, true), 'path', 'pathname', 'query'),
                                   this._baseUrl, { protocol: 'http:', host: request.headers.host });

  // Set up response error handling
  var self = this;
  response.on('error', handleError);
  function handleError(error) {
    if (self) {
      // Send a 406 response if no suitable view was found
      if (error instanceof ViewCollection.ViewCollectionError)
        self._handleNotAcceptable(request, response, next);
      // Otherwise, send the error as-is
      else
        self._handleErrorMessage(request, response, error);
      self = null;
    }
  }

  // Try to handle the request
  try {
    this._handleRequest(request, response, function (error) {
      error ? handleError(error) : next();
    });
  }
  catch (error) { handleError(error); }
};

// Tries to process the HTTP request in an implementation-specific way
Controller.prototype._handleRequest = function (request, response, next) {
  next();
};

// Serves an error indicating content negotiation failure
Controller.prototype._handleNotAcceptable = function (request, response, next) {
  this._handleErrorMessage(request, response, new Error('No suitable content type found.'), 406);
};

// Serves an application error
Controller.prototype._handleErrorMessage = function (request, response, error, status) {
  // We cannot safely change an already started response, so close the stream
  if (response.headersSent)
    return response.end();
  // Try to write an error response through an appropriate view
  var view;
  try { view = this._negotiateView('Error', request, response); }
  catch (error) { /* no acceptable view found */ }
  if (view) {
    var metadata = { prefixes: this._prefixes, datasources: this._datasources, error: error };
    response.writeHead(status || 500);
    view.render(metadata, request, response);
  }
  // If all else fails, try to write a plaintext error response
  else {
    response.writeHead(status || 500, { 'Content-Type': Util.MIME_PLAINTEXT });
    response.end('Application error: ' + error.message + '\n');
  }
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

// Cleans resources used by the controller
Controller.prototype.close = function () { };

module.exports = Controller;
