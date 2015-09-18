/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** View is a base class for objects that generate server responses. */

var _ = require('lodash');

// Creates a view with the given name
function View(viewName, contentTypes, defaults) {
  if (!(this instanceof View))
    return new View(viewName, contentTypes, defaults);
  this.name = viewName || '';
  this.supportedContentTypes = this._parseContentTypes(contentTypes);
  this._defaults = defaults || {};
}

// Makes View the prototype of the given class
View.extend = function extend(child) {
  child.prototype = Object.create(this.prototype);
  child.prototype.constructor = child;
  child.extend = extend;
};

// Parses a string of content types into an array of objects
// i.e., 'a/b,q=0.7' => [{ type: 'a/b', responseType: 'a/b;charset=utf-8', quality: 0.7 }]
// The "type" represents the MIME type,
// whereas "responseType" contains the value of the Content-Type header with encoding.
View.prototype._parseContentTypes = function (contentTypes) {
  if (typeof contentTypes === 'string') {
    contentTypes = contentTypes.split(',').map(function (typeString) {
      var contentType = typeString.match(/[^;,]*/)[0],
          quality = typeString.match(/;q=([0-9.]+)/);
      return {
        type: contentType,
        responseType: contentType + ';charset=utf-8',
        quality: quality ? Math.min(Math.max(Number.parseFloat(quality[1]), 0.0), 1.0) : 1.0,
      };
    });
  }
  return contentTypes || [];
};

// Renders the view with the given options to the response
View.prototype.render = function (options, request, response) {
  this._render(_.defaults({}, options, this._defaults), request, response);
};

// Renders the view with the given settings to the response
// (settings combines the view defaults with instance-specific options)
View.prototype._render = function (settings, request, response) {
  throw new Error('The _render method is not yet implemented.');
};

module.exports = View;
