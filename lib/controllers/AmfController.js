/*! @license ©2015 Miel Vander Sande - Multimedia Lab / iMinds / Ghent University */

/** An AmfController responds to requests for summaries */

var Controller = require('./Controller'),
    Util = require('../Util'),
    url = require('url'),
    AmfBuilder = require('../amf/AmfBuilder');

// Creates a new AmfController
function AmfController(options) {
  if (!(this instanceof AmfController))
    return new AmfController(options);
  options = options || {};
  Controller.call(this, options);

  // Attach filters
  var amf = options.amf || {};
  this._routers = options.routers || [];
  this._builder = new AmfBuilder(options);

  // Set up path matching
  this._filterPath = amf.path || '/amf/';
  this._matcher = new RegExp('^' + Util.toRegExp(this._filterPath) + '((.+?)\\?|(.+))');
}
Controller.extend(AmfController);

// Tries to serve the requested Amf
AmfController.prototype._handleRequest = function (request, response, next) {
  var self = this, filterMatch = this._matcher && this._matcher.exec(request.url),
      datasource;
  if (datasource = filterMatch && (filterMatch[2] || filterMatch[1])) {
    var fragmentUrl = url.parse(request.url, true), requestParams = { url: fragmentUrl };
    // Create the query from the request by calling the fragment routers
    var query = this._routers.reduce(function (query, router) {
      try {
        router.extractQueryParams(requestParams, query);
      }
      catch (e) {
        // ignore routing errors
      }
      return query;
    }, {
      features: [],
    });
    query.datasource = datasource;

    // Construct filter
    this._builder.build(query, function (error, filter) {
      if (error)
        next();
      else
        send(filter);
    });

    function send(filter) {
      // Set caching
      response.setHeader('Cache-Control', 'public,max-age=604800'); // 7 days

      // Render the amf
      var view = self._negotiateView('Amf', request, response);
      view.render({
        prefixes: self._prefixes,
        filter: filter,
      }, request, response);
    }
  }
  else
    next();
};

module.exports = AmfController;
