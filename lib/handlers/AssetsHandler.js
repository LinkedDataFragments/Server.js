/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An AssetsHandler responds to requests for assets */

var RequestHandler = require('./RequestHandler'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    _ = require('lodash'),
    Util = require('../Util');

// Creates a new AssetsHandler
function AssetsHandler(options) {
  if (!(this instanceof AssetsHandler))
    return new AssetsHandler(options);
  options = options || {};
  RequestHandler.call(this, options);

  // Set up path matching
  var assetsPath = options.assetsPath || '/assets/';
  this._matcher = new RegExp('^' + Util.toRegExp(assetsPath) + '(.+)|^/(\\w*)\\.ico$');

  // Read assets into memory
  var assetsFolder = options.assetsFolder || path.join(__dirname, '../../assets/');
  this._assets = fs.readdirSync(assetsFolder).reduce(function (assets, filename) {
    var assetType = mime.lookup(filename);
    return assets[filename.replace(/[.][^.]+$/, '')] = {
      type: assetType.indexOf('text/') ? assetType : assetType + ';charset=utf-8',
      contents: fs.readFileSync(path.join(assetsFolder, filename)),
    }, assets;
  }, {});
}
RequestHandler.extend(AssetsHandler);

// Try to serve the requested asset
AssetsHandler.prototype._handleRequest = function (request, response) {
  var assetMatch = request.url.match(this._matcher), asset;
  if (asset = assetMatch && this._assets[assetMatch[1] || assetMatch[2]]) {
    response.writeHead(200, {
      'Content-Type': asset.type,
      'Cache-Control': 'public,max-age=1209600', // 14 days
    });
    response.end(asset.contents);
  }
  return !!asset;
};

module.exports = AssetsHandler;
