/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A ViewCollection provides access to content-negotiated views by name. */

var _ = require('lodash'),
    negotiate = require('negotiate'),
    Util = require('../Util');

// Creates a new ViewCollection
function ViewCollection(views) {
  if (!(this instanceof ViewCollection))
    return new ViewCollection(views);
  // Views are keyed by name; each entry contains a list of content types
  this._views = {};
  views && this.addViews(views);
}

// Adds the given view to the collection
ViewCollection.prototype.addView = function (view) {
  // Get the current list of views with this name (or make a new one)
  var viewList = this._views[view.name] || (this._views[view.name] = []);
  // Add an entry for each content type supported by the view
  view.supportedContentTypes.forEach(function (contentType) {
    viewList.push(_.extend({ view: view }, contentType));
  });
};

// Adds the given views to the collection
ViewCollection.prototype.addViews = function (views) {
  for (var i = 0; i < views.length; i++)
    this.addView(views[i]);
};

// Gets all views with the given name
ViewCollection.prototype.getViews = function (name) {
  return this._views[name] || [];
};

// Gets the view with the given name that best matches the request
ViewCollection.prototype.getView = function (name, request) {
  // Retrieve the views with the given name
  var viewList = this._views[name];
  if (!viewList || !viewList.length)
    throw new ViewCollectionError('No view named ' + name + ' found.');
  // Negotiate the view best matching the request's requirements
  var viewDetails = negotiate.choose(viewList, request)[0];
  if (!viewDetails)
    throw new ViewCollectionError('No matching view named ' + name + ' found.');
  return viewDetails;
};

var ViewCollectionError = ViewCollection.ViewCollectionError =
                          Util.createErrorType('ViewCollectionError');

module.exports = ViewCollection;
