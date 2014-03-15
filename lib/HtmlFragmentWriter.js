/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A HtmlFragmentWriter represents a basic Linked Data Fragment as HTML. */

var qejs = require('qejs'),
    path = require('path'),
    _ = require('lodash'),
    N3Util = require('n3').Util;

var viewsFolder = path.join(__dirname, '../views/');

// Creates a new HtmlFragmentWriter
function HtmlFragmentWriter(outputStream, options) {
  this._triples = [];
  this._outputStream = outputStream;

  options = options || {};
  this._template = options.dataset === 'index' ? 'index' : 'datasource';
  this._options = _.extend(options, { cache: true, N3Util: N3Util, triples: this._triples });
}

HtmlFragmentWriter.prototype = {
  // Stores the specified triple
  writeTriple: function (triple) {
    this._triples.push(triple);
  },

  // Stores the fragment metadata
  writeMetadata: function (count) {
    this._options.totalCount = count;
  },

  // Writes a 'not found' response
  writeNotFound: function () {
    this._template = 'notfound';
  },

  // Writes an error response
  writeError: function () {
    this._template = 'error';
  },

  // Ends the writer, sending the output HTML
  end: function (callback) {
    var outputStream = this._outputStream;
    qejs.renderFile(viewsFolder + this._template + '.html', this._options)
    .then(function (html) {
      outputStream.write(html);
      outputStream.end();
    })
    .fail(callback);
  },
};

module.exports = HtmlFragmentWriter;
