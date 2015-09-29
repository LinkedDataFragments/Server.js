/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** HtmlView is a base class for views that generate HTML responses. */

var View = require('./View'),
    qejs = require('qejs'),
    path = require('path'),
    _ = require('lodash'),
    N3Util = require('n3').Util;

// Creates a new HTML view with the given name and settings
function HtmlView(viewName, settings) {
  if (!(this instanceof HtmlView))
    return new HtmlView(viewName, settings);
  var defaults = { cache: true, N3Util: N3Util,
                   assetsPath: '/', title: '', header: settings && settings.title };
  View.call(this, viewName, 'text/html', _.defaults({}, settings, defaults));
}
View.extend(HtmlView);

// Renders the template with the given name to the destination
HtmlView.prototype._renderTemplate = function (templateName, options, destination, done) {
  qejs.renderFile(path.join(__dirname, templateName + '.html'), options)
  .then(function (html)  { destination.write(html); done(); })
  .fail(function (error) { done(error); });
};

module.exports = HtmlView;
