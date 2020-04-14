/*! @license MIT ©2015-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A data object class for preset URL information */

// Creates a new UrlData
class UrlData {
  constructor(options) {
    // Configure preset URLs
    options = options || {};
    this.baseURL = (options.baseURL || '/').replace(/\/?$/, '/');
    this.baseURLRoot = this.baseURL.match(/^(?:https?:\/\/[^\/]+)?/)[0];
    this.baseURLPath = this.baseURL.substr(this.baseURLRoot.length);
    this.blankNodePath = this.baseURLRoot ? '/.well-known/genid/' : '';
    this.blankNodePrefix = this.blankNodePath ? this.baseURLRoot + this.blankNodePath : 'genid:';
    this.blankNodePrefixLength = this.blankNodePrefix.length;
    this.assetsPath = this.baseURLPath + 'assets/' || options.assetsPath;
    this.protocol = options.protocol;
    if (!this.protocol) {
      let protocolMatch = (this.baseURL || '').match(/^(\w+):/);
      this.protocol = protocolMatch ? protocolMatch[1] : 'http';
    }
  }
}

module.exports = UrlData;
