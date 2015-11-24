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
  this._timemaps = _.mapValues(timegates.mementos, function (mementos) {
    return _.assign(mementos, {
      timemap: sortTimemap(_.map(_.pick(options.datasources, mementos.versions),
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

/* Util methods */
function toDate(value) {
  if (!value)
    return new Date();
  return typeof value === "string" ? new Date(value) : value;
}

function sortTimemap(timemap) {
  // sort the timemap by interval start date.
  return timemap.sort(function (a, b) {
    var time1 = toDate(a.interval[0]),
        time2 = toDate(b.interval[0]);

    return time1.getTime() - time2.getTime();
  });
}

// Tries to serve the requested Timegate
TimegateController.prototype._handleRequest = function (request, response, next) {
  var self = this, timegateMatch = this._matcher && this._matcher.exec(request.url),
  datasource = timegateMatch && (timegateMatch[2] || timegateMatch[1]);
  if (datasource && this._timemaps[datasource]) {
    // retrieve Accept-Datetime & construct memento link
    var acceptDatetime = toDate(request.headers['accept-datetime']), // If no datetime is present, return most recent one
        memento = this._getClosestMemento(this._timemaps[datasource].timemap, acceptDatetime);

    // memento invalid, go to next
    if (!memento) next();

    // Construct memento and Original url
    var mementoUrl = url.format(_.assign(request.parsedUrl, { pathname: memento.dataSource})),
        parsedOriginalUrl = this._timemaps[datasource].originalBaseURL ? // If originalBaseURL is present, the original is external
                            _.assign(url.parse(this._timemaps[datasource].originalBaseURL), { query: request.parsedUrl.query }) :
                            _.defaults({ pathname: datasource }, request.parsedUrl),
        originalUrl = url.format(parsedOriginalUrl);

    response.writeHead(303, {
      'Location': mementoUrl,
      'Vary': 'Accept, Accept-Datetime',
      'Link': '<' + originalUrl + '>;rel="original", <' + mementoUrl + '>;rel="memento";datetime="' + toDate(memento.interval[0]).toUTCString() + '"'
    });
    response.end();
  }
  else
    next();
};

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
TimegateController.prototype._getClosestMemento = function (timemap, acceptDatetime, unsorted) {
    // NOTE: assuming that the interval is always specified as [start_date, end_date]

    // convert accept datetime to timestamp
    acceptDatetime = toDate(acceptDatetime).getTime();

    // If accept datetime is invalid, exit
    if (isNaN(acceptDatetime)) return null;
    // Sort timemap first if it is not sorted
    if (unsorted) sortTimemap(timemap);

    var firstMemento = timemap[0],
        firstMementoDatetime = toDate(firstMemento.interval[0]).getTime();

    // if the accept_datetime is less than the first memento, return first memento.
    if (acceptDatetime <= firstMementoDatetime) return firstMemento;

    // return the latest memento if the accept datetime is after it
    var lastMemento = timemap[timemap.length - 1],
        lastMementoDatetime = toDate(firstMemento.interval[1]).getTime();

    if (acceptDatetime >= lastMementoDatetime) return lastMemento;

    // check if the accept datetime falls within any intervals defined in the data sources.
    for (var i = 0, memento; memento = timemap[i]; i++) {
        var dataSource = memento.dataSource,
            time1 = toDate(memento.interval[0]).getTime(),
            time2 = toDate(memento.interval[1]).getTime();

        if (isNaN(time1) || isNaN(time2)) continue;
        if (time1 > acceptDatetime) return timemap[i - 1];
        if (time1 <= acceptDatetime && time2 >= acceptDatetime) return memento;
    }
    return null;
};

module.exports = TimegateController;
