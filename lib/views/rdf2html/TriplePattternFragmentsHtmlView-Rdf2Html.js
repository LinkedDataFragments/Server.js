/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A Rdf2HtmlHtmlViewExtension extends the Triple Pattern Fragments RDF view with the Rdf2Html plugin. */

var HtmlView   = require('../HtmlView'),
    N3         = require('n3'),
    TPFRdfView = require('../triplepatternfragments/TriplePatternFragmentsRdfView.js');

// Creates a new SummaryHtmlViewExtension
function Rdf2HtmlHtmlViewExtension(settings) {
  if (!(this instanceof Rdf2HtmlHtmlViewExtension))
    return new Rdf2HtmlHtmlViewExtension(settings);
  HtmlView.call(this, 'TriplePatternFragments:Data', settings);
}
HtmlView.extend(Rdf2HtmlHtmlViewExtension);

// Renders the view with the given settings to the response
Rdf2HtmlHtmlViewExtension.prototype._render = function (settings, request, response, done) {
  // If rdf2html enabled, show the extended view.
  if (settings.datasource.rdf2html) {
    var datasource = settings.datasource, fragment = settings.fragment, query = settings.query, meta = settings.metadata;

    var writer = N3.Writer({ prefixes: settings.datasource.settings.prefixes });
    settings.triples.forEach(function(triple) {
      writer.addTriple(triple);
    });
    var rdfView = new TPFRdfView('TriplePatternFragments', settings);
    rdfView.sendMetadata(function(s, p, o) {
      writer.addTriple({subject: s, predicate: p, object: o});
    }, fragment, query, datasource, meta);
    writer.end(function (error, result) { settings.serializedtriples = result; });
    this._renderTemplate('rdf2html/rdf2html-view', settings, request, response, done);
  }
  else
    done();
};

module.exports = Rdf2HtmlHtmlViewExtension;
