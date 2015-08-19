/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

// Escapes a string for use in a regular expression
module.exports.toRegExp = function (string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

// The MIME type for plaintext
module.exports.MIME_PLAINTEXT = 'text/plain;charset=utf-8';
