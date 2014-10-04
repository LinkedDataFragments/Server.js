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
  this._options = options || {};
}

// Writes the stream of triples to the destination as a Linked Data Fragment
HtmlWriter.prototype.writeFragment = function (destination, tripleStream, settings) {
  // Read the triple stream
  var triples = [], triplesComplete = false, metadata, options = this._options;
  tripleStream.on('data', function (triple) { triples.push(triple); });
  tripleStream.on('end', function () { triplesComplete = true; metadata && writeHtml(); });
  tripleStream.on('metadata', function (m) { metadata = m; triplesComplete && writeHtml(); });

  // Generates the HTML of the fragment
  function writeHtml() {
    var template = settings.datasource.role === 'index' ? 'index' : 'datasource';
    settings = _.extend(settings, {
      cache: true,
      N3Util: N3Util,
      triples: triples,
      title: options.title,
      header: options.title,
      metadata: metadata,
    });
    qejs.renderFile(viewsFolder + template + '.html', settings).then(function (html) {
      destination.write(html);
      destination.end();
    })
    .fail(function (error) { destination.emit('error', error); });
  }
};

module.exports = HtmlWriter;
