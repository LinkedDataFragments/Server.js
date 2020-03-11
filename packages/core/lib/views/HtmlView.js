/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* HtmlView is a base class for views that generate HTML responses. */

var View = require('./View'),
    qejs = require('qejs'),
    q = require('q'),
    path = require('path'),
    _ = require('lodash'),
    RdfString = require('rdf-string'),
    UrlData = require('../UrlData');

// Creates a new HTML view with the given name and settings
class HtmlView extends View {
  constructor(viewName, settings) {
    settings = settings || {};
    settings.urlData = settings.urlData || new UrlData();
    var defaults = {
      cache: true, RdfString: RdfString,
      assetsPath: settings.urlData.assetsPath || '/', baseURL: settings.urlData.baseURL || '/',
      title: '', header: settings && settings.title,
    };
    super(viewName, 'text/html', _.defaults({}, settings, defaults));
  }

  // Renders the template with the given name to the response
  _renderTemplate(templateName, options, request, response, done) {
    // Initialize all view extensions
    var extensions = options.extensions || (options.extensions = {}), self = this;
    for (var extension in extensions) {
      if (!extensions[extension])
        extensions[extension] = this._renderViewExtensionContents(extension, options, request, response);
      else if (extensions[extension] === 'function')
        extensions[extension] = newExtensionViewConstructor(extension, options, request, response);
    }

    // Render the template with its options
    var fileName = (templateName[0] === '/' ? templateName : path.join(__dirname, templateName)) + '.html';
    qejs.renderFile(fileName, options)
    .then(function (html)  { response.write(html); done(); })
    .fail(function (error) { done(error); });

    function newExtensionViewConstructor(extension, options, request, response) {
      return function (data) {
        var subOptions = _.clone(options);
        for (var key in data)
          subOptions[key] = data[key];
        return self._renderViewExtensionContents(extension, subOptions, request, response);
      };
    }
  }

  // Renders the view extensions to a string, returned through a promise
  _renderViewExtensionContents(name, options, request, response) {
    var buffer = '', writer = { write: function (data) { buffer += data; }, end: _.noop };
    return q.ninvoke(this, '_renderViewExtensions', name, options, request, writer)
            .then(function () { return buffer; });
  }
}

module.exports = HtmlView;
