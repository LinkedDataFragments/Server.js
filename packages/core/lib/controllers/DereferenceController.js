/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* A DeferenceController responds to dereferencing requests */

let Controller = require('./Controller'),
    url = require('url'),
    _ = require('lodash'),
    Util = require('../Util');

// Creates a new DeferenceController
class DeferenceController extends Controller {
  constructor(options) {
    options = options || {};
    super(options);
    let paths = this._paths = options.dereference || {};
    this._matcher = /$0^/;
    if (!_.isEmpty(paths))
      this._matcher = new RegExp('^(' + Object.keys(paths).map(Util.toRegExp).join('|') + ')');
  }

  // Dereferences a URL by redirecting to its subject fragment of a certain data source
  _handleRequest(request, response, next) {
    let match = this._matcher.exec(request.url), datasource;
    if (datasource = match && this._paths[match[1]]) {
      let entity = url.format(_.defaults({
        pathname: datasource.path,
        query: { subject: url.format(request.parsedUrl) },
      }, request.parsedUrl));
      response.writeHead(303, { 'Location': entity, 'Content-Type': Util.MIME_PLAINTEXT });
      response.end(entity);
    }
    else
      next();
  }
}

module.exports = DeferenceController;
