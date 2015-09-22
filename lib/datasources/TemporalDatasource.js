/*! @license ©2014 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A MemoryDatasource queries a set of in-memory triples. */

var fs         = require('fs'),
    Datasource = require('./Datasource'),
    path       = require('path'),
    util       = require('../Util');

// Creates a new MemoryDatasource
function TemporalDatasource(options) {
  if (!(this instanceof TemporalDatasource))
    return new TemporalDatasource(options);
  Datasource.call(this, options);
  this._staticSource = util.instantiate(options.static, '../lib/datasources/');
  this._timeRangeDatasources = {};
  this._loadTimeRanges("../../" + options.gates);
  this._gateDataource = this._constructGateDatasource();
  this._timeRangeBaseUrl = options.url; // TODO: let router(s) generate this baseUrl
}

Datasource.extend(TemporalDatasource, ['timeRangeGate', 'timeRange', 'triplePattern', 'limit', 'offset', 'totalCount']);

TemporalDatasource.prototype._loadTimeRanges = function(gatesFile) {
  // Destroy old gate datasources
  getValues(this._timeRangeDatasources).forEach((datasource) => datasource.close());
  this._timeRangeDatasources = {};

  // Get new gate configs and instantiate new gates
  this._timeRangeConfigs = JSON.parse(fs.readFileSync(path.join(__dirname, gatesFile)));
  for(var timeRangeInterval in this._timeRangeConfigs.gates) {
    var timeRangeConfig = this._timeRangeConfigs.gates[timeRangeInterval];
    var interval = timeRangeInterval.split("\|");
    timeRangeConfig.initial = interval[0];
    timeRangeConfig.final = interval[1];
    timeRangeConfig.datasourceUrl = "/timeRange?initial=" + timeRangeConfig.initial + "&final=" + timeRangeConfig.final; // TODO: improve
    this._timeRangeDatasources[timeRangeInterval] = util.instantiate(timeRangeConfig, '../lib/datasources/');
  }
};

TemporalDatasource.prototype._constructGateDatasource = function() {
  return util.instantiate({
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
TemporalDatasource.prototype._executeQuery = function(query, tripleStream, metadataCallback) {
  if(query.features.timeRangeGate) {
    this._gateDataource._executeQuery(query, tripleStream, metadataCallback);
  } else if (query.features.timeRange) {
    var timeRangeId = query.initial + "|" + query.final;
    var datasource = this._timeRangeDatasources[timeRangeId];
    datasource._executeQuery(query, tripleStream, metadataCallback);
  } else {
    // TODO: dynamically combine with dynamic data, but 'staticified'
    this._staticSource._executeQuery(query, tripleStream, metadataCallback);
  }
};

// TODO: transition to this. (more generic)
/*TemporalDatasource.prototype.select = function (query, onError) {
  if(query.features.timeRangeGate) {
    return this._gateDataource.select(query, onError);
  } else if (query.features.timeRange) {
    // TODO: datasource for all
    var timeRangeId = query.initial + "|" + query.final;
    var datasource = this._timeRangeDatasources[timeRangeId];
    return datasource.select(query, onError);
  } else {
    // TODO: dynamically combine with dynamic data, but 'staticified'
    return this._staticSource.select(query, onError);
  }
};*/

module.exports = TemporalDatasource;
