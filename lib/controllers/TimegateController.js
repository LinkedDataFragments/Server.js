/*! @license ©2015 Miel Vander Sande - Multimedia Lab / iMinds / Ghent University */

/** An TimegateController responds to timegate requests */

var Controller = require('./Controller'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    _ = require('lodash'),
    url = require('url'),
    Util = require('../Util'),
    IntervalTree = require('interval-tree2');

// Creates a new TimegateController
function TimegateController(options) {
  if (!(this instanceof TimegateController))
    return new TimegateController(options);
  options = options || {};
  Controller.call(this, options);

  // Settings for timegate
  console.log(options);

  var memento = options.memento || {};

  function buildIndex(mementos){
    var itree = new IntervalTree(Date.now());
    mementos.forEach(function(memento, index) {
      var start = new Date(memento.interval[0]).getTime(), end = new Date(memento.interval[1]).getTime();
      itree.add(start, end, index);
    });
    return itree;
  }

  this._remoteIndex = _.transform(options.datasources, function(result, datasource, name) {
    var memento = datasource.memento;

    if (memento)
      result[name] = {
        mementos: _.map(memento.remote, 'timegate'),
        index: buildIndex(memento.remote)
      };
  });
  this._routers = options.routers || [];

  // Set up path matching
  this._timegatePath = memento.timegateBaseURL  || '/timegate/',
  this._matcher = new RegExp('^' + Util.toRegExp(this._timegatePath) + '((.+?)\\?|(.+))');
}
Controller.extend(TimegateController);

// Tries to serve the requested Timegate
TimegateController.prototype._handleRequest = function (request, response, next) {
  var self = this, timegateMatch = this._matcher && this._matcher.exec(request.url),
  datasource;
  if (datasource = timegateMatch && (timegateMatch[2] || timegateMatch[1])) {
    var fragmentUrl = url.parse(request.url, true), requestParams = { url: fragmentUrl };
    // Create the query from the request by calling the fragment routers
    var query = this._routers.reduce(function (query, router) {
      try {
        router.extractQueryParams(requestParams, query);
      } catch (e) { /* ignore routing errors */ }
      return query;
    }, {
      features: []
    });
    query.datasource = datasource;

    // retrieve Accept-Datetime
    query.timestamp = request.headers['accept-datetime'] ? new Date(request.headers['accept-datetime']).getTime() : Date.now(); // If no datetime is present, return most recent one

    this._decideMemento(query, function (error, mementoUrl) {
      if (error) next();
      else {
        response.setHeader('location', mementoUrl);
        response.statusCode = 303;
        response.end();
      }
    });
  }
  else
    next();
};

TimegateController.prototype._decideMemento = function (query, callback) {
  var index = this._remoteIndex[query.datasource],
      intervals = index.index.search(query.timestamp);

  if (intervals.length >  0) {
    // if overlap, return first
    var memento = index.mementos[intervals[0].id];
    callback(null, memento);
  } else {
    //No external timegate found, looking in local

  }
};

module.exports = TimegateController;
