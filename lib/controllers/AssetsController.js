/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
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

  // Read all assets
  var assetsFolder = options.assetsFolder || path.join(__dirname, '../../assets/');
  this._assets = {};
  this._readAssetsFolder(assetsFolder, '');
}
Controller.extend(AssetsController);

// Recursively reads assets in the folder, assigning them to the URL path
AssetsController.prototype._readAssetsFolder = function (assetsFolder, assetsPath) {
  fs.readdirSync(assetsFolder).forEach(function (name) {
    var filename = path.join(assetsFolder, name), stats = fs.statSync(filename);
    // Read an asset file into memory
    if (stats.isFile()) {
      var assetType = mime.lookup(filename);
      this._assets[assetsPath + name.replace(/[.][^.]+$/, '')] = {
        type: assetType.indexOf('text/') ? assetType : assetType + ';charset=utf-8',
        contents: fs.readFileSync(filename),
      };
    }
    // Read all asset files in a folder
    else if (stats.isDirectory())
      this._readAssetsFolder(filename, assetsPath + name + '/');
  }, this);
};

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
