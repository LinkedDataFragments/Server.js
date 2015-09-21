/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A HtmlWriter represents Linked Data Fragments as HTML. */

var qejs = require('qejs'),
    path = require('path'),
    _ = require('lodash'),
    N3Util = require('n3').Util;

var viewsFolder = path.join(__dirname, '../../views/');

// Creates a new HtmlWriter
function HtmlWriter(options) {
  if (!(this instanceof HtmlWriter))
    return new HtmlWriter(options);
  var defaults = { cache: true, N3Util: N3Util, header: options && options.title };
  this._options = _.defaults(options || {}, defaults);
}

// Writes an error response
HtmlWriter.prototype.writeError = function (destination, error, settings) {
  settings.error = error;
  this._writeTemplate(destination, 'error', settings);
};

// Writes the template with the specified settings to the destination
HtmlWriter.prototype._writeTemplate = function (destination, template, settings) {
  settings = _.defaults(settings, this._options);
  qejs.renderFile(viewsFolder + template + '.html', settings).then(function (html) {
    destination.write(html);
    destination.end();
  })
  .fail(function (error) { destination.emit('error', error); });
};

module.exports = HtmlWriter;
