/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

var _    = require('lodash'),
    path = require('path');

var constructors = {};

// Escapes a string for use in a regular expression
module.exports.toRegExp = function (string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

// The MIME type for plaintext
module.exports.MIME_PLAINTEXT = 'text/plain;charset=utf-8';

// Creates a specific type of error
module.exports.createErrorType = function (BaseError, name, init) {
  if (typeof BaseError !== 'function')
    init = name, name = BaseError, BaseError = Error;
  var ErrorType = (function (message) {
    var error = this instanceof ErrorType ? this : new ErrorType(message);
    error.name = name;
    error.message = message || '';
    Error.captureStackTrace(error, error.constructor);
    init && init.apply(error, arguments);
    return error;
  });
  ErrorType.prototype = new BaseError();
  ErrorType.prototype.name = name;
  ErrorType.prototype.constructor = ErrorType;
  return ErrorType;
};

// Instantiates an object from the given description
module.exports.instantiate = function(description, includePath, config) {
  // Shift arguments
  if(!config) {
    config = includePath;
    includePath = false;
  }
  var absolutePath = includePath ? path.resolve(__dirname, includePath) : '',
    type = path.join(absolutePath, description.type || description),
    Constructor = constructors[type];
  if (!Constructor)
    Constructor = constructors[type] = require(type);
  return new Constructor(_.defaults(description.settings || {}, config));
};

// Instantiates all objects from the given descriptions
module.exports.instantiateAll = function(descriptions, includePath, config) {
  // Shift arguments
  if(!config) {
    config = includePath;
    includePath = false;
  }
  var self = this;
  return (_.isArray(descriptions) ? _.map : _.mapValues)
  (descriptions, function (description) { return self.instantiate(description, includePath, config); });
};
