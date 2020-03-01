/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/*
 A ViewCollection provides access to content-negotiated views by name.

 It can hold multiple views with the same name.
 `matchViews` performs content negotiation to find the most appropriate view for a response.
 `getViews` returns all views with a given name.
*/

var _ = require('lodash'),
    negotiate = require('negotiate'),
    Util = require('../Util');


// Creates a new ViewCollection
class ViewCollection {
  constructor(views) {
    this._views = {};        // Views keyed by name
    this._viewMatchers = {}; // Views matchers keyed by name; each one matches one content type
    views && this.addViews(views);
  }

  // Adds the given view to the collection
  addView(view) {
    // Add the view to the list per type
    (this._views[view.name] || (this._views[view.name] = [])).push(view);
    // Add a match entry for each content type supported by the view
    var matchers = this._viewMatchers[view.name] || (this._viewMatchers[view.name] = []);
    view.supportedContentTypes.forEach(function (contentType) {
      matchers.push(_.extend({ view: view }, contentType));
    });
  }

  // Adds the given views to the collection
  addViews(views) {
    for (var i = 0; i < views.length; i++)
      this.addView(views[i]);
  }

  // Gets all views with the given name
  getViews(name) {
    return this._views[name] || [];
  }
}

var ViewCollectionError = ViewCollection.ViewCollectionError = Util.createErrorType('ViewCollectionError');

// Gets the best match for views with the given name that accommodate the request
ViewCollection.prototype.matchView = function (name, request) {
  // Retrieve the views with the given name
  var viewList = this._viewMatchers[name];
  if (!viewList || !viewList.length)
    throw new ViewCollectionError('No view named ' + name + ' found.');
  // Negotiate the view best matching the request's requirements
  var viewDetails = negotiate.choose(viewList, request)[0];
  if (!viewDetails)
    throw new ViewCollectionError('No matching view named ' + name + ' found.');
  return viewDetails;
};

module.exports = ViewCollection;
