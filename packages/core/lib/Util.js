/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

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
  function ErrorType(message) {
    let error = this instanceof ErrorType ? this : new ErrorType(message);
    error.name = name;
    error.message = message || '';
    Error.captureStackTrace(error, error.constructor);
    init && init.apply(error, arguments);
    return error;
  }
  ErrorType.prototype = new BaseError();
  ErrorType.prototype.name = name;
  ErrorType.prototype.constructor = ErrorType;
  return ErrorType;
};
