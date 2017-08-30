/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Controller is a base class for HTTP request handlers */

var url = require('url'),
    _ = require('lodash'),
    ViewCollection = require('../views/ViewCollection'),
    Util = require('../Util'),
    parseForwarded = require('forwarded-parse');

// Creates a new Controller
function Controller(options) {
  if (!(this instanceof Controller))
    return new Controller(options);
  options = options || {};
  this._prefixes = options.prefixes || {};
  this._datasources = options.datasources || {};
  this._views = options.views && options.views.matchView ?
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
Controller.prototype.handleRequest = function (request, response, next, settings) {
  // Add a `parsedUrl` field to `request`,
  // containing the parsed request URL, resolved against the base URL
  if (!request.parsedUrl) {
    // Keep the request's path and query, but take over all other defined baseURL properties
    request.parsedUrl = _.defaults(_.pick(url.parse(request.url, true), 'path', 'pathname', 'query'),
                                   this._baseUrl,
                                   this._getForwarded(request),
                                   this._getXForwardHeaders(request),
                                   { protocol: 'http:', host: request.headers.host });
  }

  // Try to handle the request
  var self = this;
  try { this._handleRequest(request, response, done, settings); }
  catch (error) { done(error); }
  function done(error) {
    if (self) {
      // Send a 406 response if no suitable view was found
      if (error instanceof ViewCollection.ViewCollectionError)
        return self._handleNotAcceptable(request, response, next);
      self = null;
      next(error);
    }
  }
};

// Get host and protocol from HTTP's Forwarded header
Controller.prototype._getForwarded = function (request) {
  if (!request.headers.forwarded)
    return {};
  try {
    var forwarded = _.defaults.apply(this, parseForwarded(request.headers.forwarded));
    return {
      protocol: forwarded.proto ? forwarded.proto + ':' : undefined,
      host: forwarded.host,
    };
  }
  catch (error) { return {}; }
};

// Get host and protocol from HTTP's X-Forwarded-* headers
Controller.prototype._getXForwardHeaders = function (request) {
  return {
    protocol: request.headers['x-forwarded-proto'] ? request.headers['x-forwarded-proto'] + ':' : undefined,
    host: request.headers['x-forwarded-host'],
  };
};

// Tries to process the HTTP request in an implementation-specific way
Controller.prototype._handleRequest = function (request, response, next, settings) {
  next();
};

// Serves an error indicating content negotiation failure
Controller.prototype._handleNotAcceptable = function (request, response, next) {
  response.writeHead(406, { 'Content-Type': Util.MIME_PLAINTEXT });
  response.end('No suitable content type found.\n');
};

// Finds an appropriate view using content negotiation
Controller.prototype._negotiateView = function (viewName, request, response) {
  // Indicate that the response is content-negotiated
  var vary = response.getHeader('Vary');
  response.setHeader('Vary', 'Accept' + (vary ? ', ' + vary : ''));
  // Negotiate a view
  var viewMatch = this._views.matchView(viewName, request);
  response.setHeader('Content-Type', viewMatch.responseType || viewMatch.type);
  return viewMatch.view;
};

// Cleans resources used by the controller
Controller.prototype.close = function () { };

module.exports = Controller;
