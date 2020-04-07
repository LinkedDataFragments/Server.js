/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A QuadPatternFragmentsRdfView represents a TPF or QPF in HTML. */

let HtmlView = require('@ldf/core').views.HtmlView,
    join = require('path').join;

// Creates a new QuadPatternFragmentsHtmlView
class QuadPatternFragmentsHtmlView extends HtmlView {
  constructor(settings) {
    super('QuadPatternFragments', settings);

    this.viewDirectory = __dirname;
  }

  // Renders the view with the given settings to the response
  _render(settings, request, response, done) {
    // Read the data and metadata
    let self = this, quads = settings.quads = [], results = settings.results;
    results.on('data', (triple) => { quads.push(triple); });
    results.on('end',  () => { settings.metadata && renderHtml(); });
    results.getProperty('metadata', (metadata) => {
      settings.metadata = metadata;
      results.ended && renderHtml();
    });

    // Generates the HTML after the data and metadata have been retrieved
    function renderHtml() {
      let template = settings.datasource.role === 'index' ? 'index' : 'datasource';
      settings.extensions = { Before: null, FormBefore: null, FormAfter: null, QuadBefore: 'function', QuadAfter: 'function', After: null };
      self._renderTemplate(join(self.viewDirectory, template), settings, request, response, done);
    }
  }
}

module.exports = QuadPatternFragmentsHtmlView;
