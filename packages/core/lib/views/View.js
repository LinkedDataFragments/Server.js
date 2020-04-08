/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* View is a base class for objects that generate server responses. */

let join = require('path').join,
    ViewCollection = require('./ViewCollection');

// Creates a view with the given name
class View {
  constructor(viewName, contentTypes, defaults) {
    this.name = viewName || '';
    this._parseContentTypes(contentTypes);
    this._defaults = defaults || {};
    this.dataFactory = this._defaults.dataFactory;
    if (this._defaults.views)
      this._defaults.views = new ViewCollection(defaults.views);
  }

  // Parses a string of content types into an array of objects
  // i.e., 'a/b,q=0.7' => [{ type: 'a/b', responseType: 'a/b;charset=utf-8', quality: 0.7 }]
  // The "type" represents the MIME type,
  // whereas "responseType" contains the value of the Content-Type header with encoding.
  _parseContentTypes(contentTypes) {
    let matcher = this._supportedContentTypeMatcher = Object.create(null);
    if (typeof contentTypes === 'string') {
      contentTypes = contentTypes.split(',').map((typeString) => {
        let contentType = typeString.match(/[^;,]*/)[0],
            responseType = contentType + ';charset=utf-8',
            quality = typeString.match(/;q=([0-9.]+)/);
        matcher[contentType] = matcher[responseType] = true;
        return {
          type: contentType,
          responseType: responseType,
          quality: quality ? Math.min(Math.max(parseFloat(quality[1]), 0.0), 1.0) : 1.0,
        };
      });
    }
    this.supportedContentTypes = contentTypes || [];
  }

  // Indicates whether the view supports the given content type
  supportsContentType(contentType) {
    return this._supportedContentTypeMatcher[contentType];
  }

  // Renders the view with the given options to the response
  render(options, request, response, done) {
    // Initialize view-specific settings
    let settings = { ...options, ...this._defaults };
    if (!settings.contentType)
      settings.contentType = response.getHeader('Content-Type');

    // Export our base view, so it can be reused by other modules
    settings.viewPathBase = join(__dirname, 'base.html');

    // Render the view and end the response when done
    this._render(settings, request, response, (error) => {
      if (error)
        response.emit('error', error);
      response.end();
      done && done();
    });
  }

  // Gets extensions with the given name for this view
  _getViewExtensions(name, contentType) {
    let extensions = this._defaults.views ? this._defaults.views.getViews(this.name + ':' + name) : [];
    if (extensions.length) {
      extensions = extensions.filter((extension) => {
        return extension.supportsContentType(contentType);
      });
    }
    return extensions;
  }

  // Renders the extensions with the given name for this view
  _renderViewExtensions(name, options, request, response, done) {
    let self = this, extensions = this._getViewExtensions(name, options.contentType), i = 0;
    (function next() {
      if (i < extensions.length)
        self._renderViewExtension(extensions[i++], options, request, response, next);
      else
        done();
    })();
  }

  // Renders the specified view extension
  _renderViewExtension(extension, options, request, response, done) {
    extension.render(options, request, response, done);
  }

  // Renders the view with the given settings to the response
  // (settings combines the view defaults with instance-specific options)
  _render(settings, request, response, done) {
    throw new Error('The _render method is not yet implemented.');
  }
}



module.exports = View;
