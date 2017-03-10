/*! @license MIT ©2017 Ruben Taelman, Ghent University - imec */
/** A VersionRdfViewExtension extends the Quad Pattern Fragments RDF view with versioning controls. */

var RdfView = require('../RdfView');

// Creates a new VersionRdfViewExtension
function VersionRdfViewExtension(settings) {
  if (!(this instanceof VersionRdfViewExtension))
    return new VersionRdfViewExtension(settings);
  RdfView.call(this, 'QuadPatternFragments:Before', settings);
}
RdfView.extend(VersionRdfViewExtension);

// Renders the view with the given settings to the response
VersionRdfViewExtension.prototype._generateRdf = function (settings, request, metadata, done) {
  if (settings.query.version || settings.query.version === 0)
    settings.datasource.templateUrl = settings.datasource.datasourceUrl + '?versionType=VersionMaterialized&version=' + settings.query.version + '{&subject,predicate,object}';
  done();
};

module.exports = VersionRdfViewExtension;
