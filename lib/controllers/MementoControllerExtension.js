/*! @license MIT ©2016 Miel Vander Sande - Ghent University / iMinds */
/* A MementoControllerExtension extends Triple Pattern Fragments responses with Memento headers. */

var url = require('url'),
    _ = require('lodash');

// Creates a new MementoControllerExtension
function MementoControllerExtension(settings) {
  if (!(this instanceof MementoControllerExtension))
    return new MementoControllerExtension(settings);

  var timegates = settings.timegates || {}, timegateMap = {};
  this._timegateBaseUrl = timegates.baseURL || '/timegate/';
  this._timegateMap = timegateMap;
  _.forIn(timegates.mementos || {}, function (setting, key) {
    setting.versions.forEach(function (entry) {
      timegateMap[entry] = { memento: key,
        original: setting.originalBaseURL || ((settings.baseURL || '/') + key),
      };
    });
  });
}

// Add Memento Link headers
MementoControllerExtension.prototype._handleRequest = function (request, response, next, settings) {
  var datasource = settings.query.datasource,
      memento = settings.datasource.memento,
      requestQuery = request.url.match(/\?.*|$/)[0];

  // Add link to original if it is a memento
  if (memento && memento.interval && memento.interval.length === 2) {
    var timegatePath = this._timegateBaseUrl + this._timegateMap[datasource].memento,
        timegateUrl = url.format(_.defaults({ pathname: timegatePath }, request.parsedUrl)),
        originalUrl = this._timegateMap[datasource].original + requestQuery,
        datetime = new Date(memento.interval[0]).toUTCString();

    response.setHeader('Link', '<' + originalUrl + '>;rel=original, <' + timegateUrl + '>;rel=timegate');
    response.setHeader('Memento-Datetime', datetime);
  }
  // Add timegate link if resource is not a memento
  else {
    var timegateSettings = settings.datasource.timegate, timegate;
    // If a timegate URL is given, use it
    if (typeof timegateSettings === 'string')
      timegate = timegateSettings + requestQuery;
    // If the timegate configuration is true, use local timegate
    else if (timegateSettings === true)
      timegate = url.format(_.defaults({ pathname: this._timegateBaseUrl + datasource }, request.parsedUrl));
    if (timegate)
      response.setHeader('Link', '<' + timegate + '>;rel=timegate');
  }
  next();
};

module.exports = MementoControllerExtension;
