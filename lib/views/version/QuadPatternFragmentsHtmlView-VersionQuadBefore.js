/*! @license MIT ©2017 Ruben Taelman, Ghent University - imec */
/** A VersionHtmlViewExtension extends the Quad Pattern Fragments HTML view with versioning controls. */

var HtmlView = require('../HtmlView');

// Creates a new VersionHtmlViewExtension
function VersionHtmlViewExtension(settings) {
  if (!(this instanceof VersionHtmlViewExtension))
    return new VersionHtmlViewExtension(settings);
  HtmlView.call(this, 'QuadPatternFragments:QuadBefore', settings);
}
HtmlView.extend(VersionHtmlViewExtension);

// Renders the view with the given settings to the response
VersionHtmlViewExtension.prototype._render = function (settings, request, response, done) {
  if (settings.datasource.supportsVersioning)
    this._renderTemplate('version/version-quad-before', settings, request, response, done);
  else
    done();
};

module.exports = VersionHtmlViewExtension;
