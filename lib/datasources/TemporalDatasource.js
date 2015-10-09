/*! @license ©2014 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A MemoryDatasource queries a set of in-memory triples. */

var fs         = require('fs'),
    Datasource = require('./Datasource'),
    path       = require('path'),
    util       = require('../Util');

// Creates a new TemporalDatasource
function TemporalDatasource(options) {
  if (!(this instanceof TemporalDatasource))
    return new TemporalDatasource(options);
  Datasource.call(this, options);
  this._staticSource = util.instantiate(false, options.static, '../lib/datasources/');
  this._timeRangeDatasources = {};
  this._timeRangeBaseUrl = "/" + options.datasourceName; // TODO: let router(s) generate this baseUrl?
  this._loadTimeRanges("../../" + options.gates);
  this._gateDataource = this._constructGateDatasource();
}

Datasource.extend(TemporalDatasource, ['timeRangeGate', 'timeRange', 'triplePattern', 'limit', 'offset', 'totalCount']);

TemporalDatasource.prototype._loadTimeRanges = function(gatesFile) {
  // Destroy old gate datasources
  getValues(this._timeRangeDatasources).forEach((datasource) => datasource.close());
  this._timeRangeDatasources = {};
  var self = this;

  // Get new gate configs and instantiate new gates
  this._timeRangeConfigs = JSON.parse(fs.readFileSync(path.join(__dirname, gatesFile)));
  for(var timeRangeInterval in this._timeRangeConfigs.gates) {
    var timeRangeConfig = this._timeRangeConfigs.gates[timeRangeInterval];
    var interval = timeRangeInterval.split("\|");
    timeRangeConfig.initial = interval[0];
    timeRangeConfig.final = interval[1];
    timeRangeConfig.datasourceUrl = self._timeRangeBaseUrl + "/timeRange?initial=" + timeRangeConfig.initial + "&final=" + timeRangeConfig.final; // TODO: improve
    this._timeRangeDatasources[timeRangeInterval] = util.instantiate({}, timeRangeConfig, '../lib/datasources/');
  }
};

TemporalDatasource.prototype._constructGateDatasource = function() {
  return util.instantiate(false, {
    type: "TimeRangeGateDatasource",
    settings: {
      timeRangeConfigs: getValues(this._timeRangeConfigs.gates)
    }
  }, '../lib/datasources/');
};

function mapReduce(map, f, initial) {
  return Object.keys(map).reduce((previous, k) => f(previous, k, map[k]), initial);
}

function getValues(dict) {
  return mapReduce(dict, (previous, _, v) => {
    previous.push(v);
    return previous;
  }, []);
}

// Writes the results of the query to the given triple stream
/*TemporalDatasource.prototype._executeQuery = function(query, tripleStream, metadataCallback) {
  if(query.features.timeRangeGate) {
    this._gateDataource._executeQuery(query, tripleStream, metadataCallback);
  } else if (query.features.timeRange) {
    var timeRangeId = query.initial + "|" + query.final;
    var datasource = this._timeRangeDatasources[timeRangeId];
    datasource._executeQuery(query, tripleStream, metadataCallback);
  } else {
    // TODO: dynamically combine with dynamic data (latest version of each fact <- how to determine this?), but 'staticified'
    this._staticSource._executeQuery(query, tripleStream, metadataCallback);
  }
};*/

// TODO: transition to this. (more generic)
TemporalDatasource.prototype.select = function (query, onError) {
  var self = this;
  return attemptFeatures(query, {
    "timeRangeGate": function(q) {
      return self._gateDataource.select(q, onError);
    },
    "timeRange": function(q) {
      var timeRangeId = q.initial + "|" + q.final;
      var datasource = self._timeRangeDatasources[timeRangeId];
      return datasource.select(q, onError);
    }}, function(q) {
    return self._staticSource.select(q, onError);
  });
};

function attemptFeatures(query, featureMap, defaultFunction) {
  for(feature in featureMap) {
    if (query.features[feature]) {
      delete query.features[feature];
      var ret = featureMap[feature](query);
      query.features[feature] = true;
      return ret;
    }
  }
  return defaultFunction(query);
}

module.exports = TemporalDatasource;
