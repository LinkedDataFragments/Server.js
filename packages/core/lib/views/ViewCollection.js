/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/*
 A ViewCollection provides access to content-negotiated views by name.

 It can hold multiple views with the same name.
 `matchViews` performs content negotiation to find the most appropriate view for a response.
 `getViews` returns all views with a given name.
*/

let negotiate = require('negotiate'),
    Util = require('../Util');

let ViewCollectionError = Util.createErrorType('ViewCollectionError');

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
    let matchers = this._viewMatchers[view.name] || (this._viewMatchers[view.name] = []);
    view.supportedContentTypes.forEach((contentType) => {
      matchers.push({ ...contentType, view: view });
    });
  }

  // Adds the given views to the collection
  addViews(views) {
    for (let i = 0; i < views.length; i++)
      this.addView(views[i]);
  }

  // Gets all views with the given name
  getViews(name) {
    return this._views[name] || [];
  }

  // Gets the best match for views with the given name that accommodate the request
  matchView(name, request) {
    // Retrieve the views with the given name
    let viewList = this._viewMatchers[name];
    if (!viewList || !viewList.length)
      throw new ViewCollectionError('No view named ' + name + ' found.');
    // Negotiate the view best matching the request's requirements
    let viewDetails = negotiate.choose(viewList, request)[0];
    if (!viewDetails)
      throw new ViewCollectionError('No matching view named ' + name + ' found.');
    return viewDetails;
  }
}
ViewCollection.ViewCollectionError = ViewCollectionError;

module.exports = ViewCollection;
