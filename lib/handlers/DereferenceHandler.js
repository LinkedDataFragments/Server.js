/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A DereferenceHandler responds to dereferencing requests */

var RequestHandler = require('./RequestHandler'),
    url = require('url'),
    _ = require('lodash'),
    Util = require('../Util');

// Creates a new DereferenceHandler
function DereferenceHandler(options) {
  if (!(this instanceof DereferenceHandler))
    return new DereferenceHandler(options);
  options = options || {};
  RequestHandler.call(this, options);

  var paths = this._paths = options.dereference || {};
  if (!_.isEmpty(paths))
    this._matcher = new RegExp('^(' + Object.keys(paths).map(Util.toRegExp).join('|') + ')');
}
RequestHandler.extend(DereferenceHandler);

// This default matcher never matches
DereferenceHandler.prototype._matcher = /$0^/;

// Dereferences a URL by redirecting to its subject fragment of a certain data source
DereferenceHandler.prototype._handleRequest = function (request, response) {
  var match = this._matcher.exec(request.url), datasource;
  if (datasource = match && this._paths[match[1]]) {
    var entity = url.format(_.defaults({
      pathname: '/' + datasource,
      query: { subject: url.format(request.parsedUrl) },
    }, request.parsedUrl));
    response.writeHead(303, { 'Location': entity, 'Content-Type': Util.MIME_PLAINTEXT });
    response.end(entity);
  }
  return !!datasource;
};

module.exports = DereferenceHandler;
