/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** HtmlView is a base class for views that generate RDF responses. */

var View = require('./View'),
    N3 = require('n3');

var primaryTopic = 'http://xmlns.com/foaf/0.1/primaryTopic';

var contentTypes = 'application/trig;q=0.9,application/n-quads;q=0.7,' + 
                   'application/ld+json;q=0.8,application/json;q=0.8,' +
                   'text/turtle;q=0.6,text/n-triples;q=0.5,text/n3;q=0.6';

// Creates a new RDF view with the given name and settings
function RdfView(viewName, settings) {
  if (!(this instanceof RdfView))
    return new RdfView(viewName, settings);
  View.call(this, viewName, contentTypes, settings);
}
View.extend(RdfView);

// Renders the view with the given settings to the response
RdfView.prototype._render = function (settings, request, response) {
  var writer = this._createWriter(settings, response);
  this._generateRdf(settings, writer.data, writer.meta);
  writer.end();
};

// Creates a specific RDF writer depending on the content type
RdfView.prototype._createWriter = function (options, response) {
  var fragmentUrl = options.fragment && options.fragment.url || '',
      contentType = response.getHeader('Content-Type'),
      supportsGraphs = !(/turtle|triples|n3/.test(contentType)), metadataGraph,
      writer = new N3.Writer({ format: contentType, prefixes: options.prefixes });
  return {
    // Adds the data triple to the output
    data: function (s, p, o, g) {
      writer.addTriple(s, p, o, supportsGraphs ? g : null);
    },
    // Adds the metadata triple to the output
    meta: function (s, p, o) {
      // Relate the metadata graph to the data
      if (supportsGraphs && !metadataGraph)
        writer.addTriple(metadataGraph = fragmentUrl + '#metadata',
                         primaryTopic, fragmentUrl, metadataGraph);
      // Write the triple
      if (s && p && o && !N3.Util.isLiteral(s))
        writer.addTriple(s, p, o, metadataGraph);
    },
    // Ends the output and flushes the stream
    end: function () {
      writer.end(function (error, output) { response.end(output); });
    },
  };
};

// Generates triples and quads by sending them to the data and/or metadata callbacks
RdfView.prototype._generateRdf = function (settings, data, metadata) {
  throw new Error('The _generateRdf method is not yet implemented.');
};

module.exports = RdfView;
