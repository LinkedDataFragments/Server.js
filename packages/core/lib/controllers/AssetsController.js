/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* An AssetsController responds to requests for assets */

let Controller = require('./Controller'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    Util = require('../Util'),
    UrlData = require('../UrlData');

// Creates a new AssetsController
class AssetsController extends Controller {
  constructor(options) {
    options = options || {};
    super(options);

    // Set up path matching
    let assetsPath = (options.urlData || new UrlData()).assetsPath || '/assets/';
    this._matcher = new RegExp('^' + Util.toRegExp(assetsPath) + '(.+)|^/(\\w*)\\.ico$');

    // Read all assets
    let assetsFolders = options.assetsFolders || ['file:///' + path.join(__dirname, '../../assets/')];
    this._assets = {};
    for (let i = 0; i < assetsFolders.length; i++)
      this._readAssetsFolder(assetsFolders[i], '');
  }

  // Recursively reads assets in the folder, assigning them to the URL path
  _readAssetsFolder(assetsFolder, assetsPath) {
    if (assetsFolder.indexOf('file:///') === 0)
      assetsFolder = assetsFolder.replace('file:///', '');
    fs.readdirSync(assetsFolder).forEach(function (name) {
      let filename = path.join(assetsFolder, name), stats = fs.statSync(filename);
      // Read an asset file into memory
      if (stats.isFile()) {
        let assetType = mime.getType(filename);
        this._assets[assetsPath + name.replace(/[.][^.]+$/, '')] = {
          type: assetType.indexOf('text/') ? assetType : assetType + ';charset=utf-8',
          contents: fs.readFileSync(filename),
        };
      }
      // Read all asset files in a folder
      else if (stats.isDirectory())
        this._readAssetsFolder(filename, assetsPath + name + '/');
    }, this);
  }

  // Try to serve the requested asset
  _handleRequest(request, response, next) {
    let assetMatch = request.url.match(this._matcher), asset;
    if (asset = assetMatch && this._assets[assetMatch[1] || assetMatch[2]]) {
      response.writeHead(200, {
        'Content-Type': asset.type,
        'Cache-Control': 'public,max-age=1209600', // 14 days
      });
      response.end(asset.contents);
    }
    else
      next();
  }
}

module.exports = AssetsController;
