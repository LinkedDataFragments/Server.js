/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
/* An AssetsController responds to requests for assets */

var Controller = require('./Controller'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    Util = require('../Util');

// Creates a new AssetsController
function AssetsController(options) {
  if (!(this instanceof AssetsController))
    return new AssetsController(options);
  options = options || {};
  Controller.call(this, options);

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
Controller.extend(AssetsController);

// Try to serve the requested asset
AssetsController.prototype._handleRequest = function (request, response, next) {
  var assetMatch = request.url.match(this._matcher), asset;
  if (asset = assetMatch && this._assets[assetMatch[1] || assetMatch[2]]) {
    response.writeHead(200, {
      'Content-Type': asset.type,
      'Cache-Control': 'public,max-age=1209600', // 14 days
    });
    response.end(asset.contents);
  }
  else
    next();
};

module.exports = AssetsController;
