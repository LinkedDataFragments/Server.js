/*! @license ©2015 Miel Vander Sande - Multimedia Lab / iMinds / Ghent University */

/** An TimegateController responds to timegate requests */

var Controller = require('./Controller'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    _ = require('lodash'),
    url = require('url'),
    Util = require('../Util');

// Creates a new TimegateController
function TimegateController(options) {
  if (!(this instanceof TimegateController))
    return new TimegateController(options);
  options = options || {};
  Controller.call(this, options);

  // Settings for timegate
  var timegates = options.timegates || {};

  var self = this;
  this._timemaps = _.mapValues(timegates.mementos, function (mementos) {
    return _.assign(mementos, {
      timemap: self._sortTimemap(_.map(_.pick(options.datasources, mementos.versions),
        function (datasource, key) {
          return _.assign(datasource.memento, { dataSource: key });
        }))
      });
  });
  this._routers = options.routers || [];

  // Set up path matching
  this._timegatePath = timegates.baseUrl  || '/timegate/',
  this._matcher = new RegExp('^' + Util.toRegExp(this._timegatePath) + '((.+?)\\?|(.+))');
}
Controller.extend(TimegateController);

// Tries to serve the requested Timegate
TimegateController.prototype._handleRequest = function (request, response, next) {
  var self = this, timegateMatch = this._matcher && this._matcher.exec(request.url),
  datasource;
  if (datasource = timegateMatch && (timegateMatch[2] || timegateMatch[1])) {
    // retrieve Accept-Datetime
    var acceptDatetime = request.headers['accept-datetime'] ? new Date(request.headers['accept-datetime']) : new Date(), // If no datetime is present, return most recent one
        memento = this._getClosestMemento(this._timemaps[datasource].timemap, acceptDatetime, true),
        mementoUrl = url.format(_.assign(request.parsedUrl, { pathname: memento.dataSource}));

    var parsedOriginalUrl = this._timemaps[datasource].originalBaseURL ? // If originalBaseURL is present, the original is external
        _.assign(url.parse(this._timemaps[datasource].originalBaseURL), { query: request.parsedUrl.query }) :
        _.assign(request.parsedUrl, { pathname: datasource });

    var originalUrl = url.format(parsedOriginalUrl);

    response.writeHead(303, {
      'Location': mementoUrl,
      'Link': originalUrl + ';rel="original"'
    });
    response.end();
  }
  else
    next();
};

TimegateController.prototype._sortTimemap = function(timemap) {
  // sort the timemap by interval start date.
  return timemap.sort(function(a, b) {
      var time1 = a.interval[0];
      var time2 = b.interval[0] ? b.interval[0] : new Date();

      if (typeof(time1) == "string") {
          time1 = new Date(time1);
      }
      if (typeof(time2) == "string") {
          time2 = new Date(time2);
      }
      return time1.getTime() - time2.getTime();
  });
};

TimegateController.prototype._getClosestMemento = function (timemap, accept_datetime, sorted) {
    /*
       * @param timemap: [{"dataSource": "data source name", "interval": [start, end]}, ...]
                       the start, end values can either be Date objects, or ISO 8601 string.
       * @param accept_datetime: the requested datetime value as Date object, or ISO 8601 string.
       * @param sorted: bool. If not sorted, the timemap will be sorted using the start time in the interval.

       * eg:
        var timemap = [
          {"dataSource": "dbpedia_2012", "interval": ["2011-10-20T12:22:24Z", new Date("2012-10-19T12:22:24Z")]},
          {"dataSource": "dbpedia_2015", "interval": ["2014-10-20T12:22:24Z", ""]},
          {"dataSource": "dbpedia_2013", "interval": [new Date("2012-10-20T12:22:24Z"), new Date("2013-10-19T12:22:24Z")]},
          {"dataSource": "dbpedia_2014", "interval": ["2013-10-20T12:22:24Z", "2014-10-19T12:22:24Z"]}
        ];
        get_closest_memento(timemap, "2011-10-20T12:22:24Z", false);
    */

    // NOTE: assuming that the interval is always specified as [start_date, end_date]

    // convert accept datetime to a Date
    if (typeof(accept_datetime) === "string") {
        accept_datetime = new Date(accept_datetime);
    }
    accept_datetime = accept_datetime.getTime();

    if (isNaN(accept_datetime)) {
        return null;
    }

    if (!sorted) this._sortTimemap(timemap);

    // if the accept_datetime is less than the first memento, return first memento.
    var firstMemento = timemap[0];
    var firstMementoDatetime;
    if (typeof(firstMemento.interval[0]) == "string") {
        firstMementoDatetime = new Date(firstMemento.interval[0]).getTime();
    } else {
        firstMementoDatetime = firstMemento.interval[0].getTime();
    }
    if (accept_datetime <= firstMementoDatetime) {
        return firstMemento;
    }

    // return the latest memento if the accept datetime is after it 
    var lastMemento = timemap[timemap.length-1];
    var lastMementoDatetime;
    if (lastMemento.interval[1] === "") {
        lastMementoDatetime = new Date().getTime();
    } else if (typeof(lastMemento.interval[1]) == "string") {
        lastMementoDatetime = new Date(lastMemento.interval[1]).getTime();
    } else {
        lastMementoDatetime = lastMemento.interval[1].getTime();
    }

    if (accept_datetime >= lastMementoDatetime) {
        return lastMemento;
    }

    // check if the accept datetime falls within any intervals defined in the data sources.
    for (var i = 0, memento; memento = timemap[i]; i++) {
        var dataSource = memento.dataSource;
        var time1 = memento.interval[0];
        var time2 = memento.interval[1] ? memento.interval[1] : new Date();

        if (typeof(time1) === "string") {
            time1 = new Date(time1);
        }
        if (typeof(time2) === "string") {
            time2 = new Date(time2);
        }
        time1 = time1.getTime();
        time2 = time2.getTime();

        if (isNaN(time1) || isNaN(time2)) {
            continue;
        }

        if (time1 > accept_datetime) {
            return timemap[i-1];
        }

        if (time1 <= accept_datetime && time2 >= accept_datetime) {
            return memento;
        }
    }
    return null;
};

module.exports = TimegateController;
